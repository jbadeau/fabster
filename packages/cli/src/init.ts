import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadCatalog } from '@fabster/server';
import type { CatalogSkill } from '@fabster/server';

export type InitStatus = 'create' | 'update' | 'skip';

export interface InitAction {
  /** Short group label, e.g. "MCP", "Skill", "Context", "Tools". */
  group: string;
  /** What is being written, e.g. "Claude Code". */
  title: string;
  /** Repo-relative path being written. */
  target: string;
  status: InitStatus;
  apply: () => Promise<void>;
}

// MCP servers fabster recommends every repo expose to its AI assistants.
const MCP_COMMAND = 'npx';
const MCP_ARGS = ['nx', 'mcp'];
const MCP_NAME = 'nx-mcp';

async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf-8');
  } catch {
    return null;
  }
}

async function readJson(file: string): Promise<Record<string, unknown> | null> {
  const text = await readText(file);
  if (text == null) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

/** Build an action that merges an MCP server into a JSON config under `key`. */
function jsonMcpAction(opts: {
  title: string;
  cwd: string;
  rel: string;
  key: 'mcpServers' | 'mcp';
  server: Record<string, unknown>;
  extra?: Record<string, unknown>;
}): () => Promise<InitAction> {
  const file = path.join(opts.cwd, opts.rel);
  return async () => {
    const existing = await readJson(file);
    const container = existing?.[opts.key] as Record<string, unknown> | undefined;
    const present = container?.[MCP_NAME] != null;
    const status: InitStatus = present ? 'skip' : existing ? 'update' : 'create';
    return {
      group: 'MCP',
      title: opts.title,
      target: opts.rel,
      status,
      apply: async () => {
        const root = (await readJson(file)) ?? {};
        const servers = (root[opts.key] as Record<string, unknown>) ?? {};
        servers[MCP_NAME] = opts.server;
        root[opts.key] = servers;
        for (const [k, v] of Object.entries(opts.extra ?? {})) {
          if (root[k] == null) root[k] = v;
        }
        await writeJson(file, root);
      },
    };
  };
}

function codexMcpAction(cwd: string): () => Promise<InitAction> {
  const rel = '.codex/config.toml';
  const file = path.join(cwd, rel);
  const block = `[mcp_servers.${MCP_NAME}]\ncommand = "${MCP_COMMAND}"\nargs = [${MCP_ARGS.map((a) => `"${a}"`).join(', ')}]\n`;
  return async () => {
    const existing = await readText(file);
    const present = existing?.includes(`[mcp_servers.${MCP_NAME}]`) ?? false;
    const status: InitStatus = present ? 'skip' : existing ? 'update' : 'create';
    return {
      group: 'MCP',
      title: 'Codex',
      target: rel,
      status,
      apply: async () => {
        await mkdir(path.dirname(file), { recursive: true });
        const prior = (await readText(file)) ?? '';
        const next = prior.trim().length > 0 ? `${prior.trimEnd()}\n\n${block}` : block;
        await writeFile(file, next);
      },
    };
  };
}

/** Build an action that writes an exact file, marked skip when already identical. */
function fileAction(opts: {
  group: string;
  title: string;
  cwd: string;
  rel: string;
  content: string;
  /** When true, only create if missing; never overwrite. */
  createOnly?: boolean;
}): () => Promise<InitAction> {
  const file = path.join(opts.cwd, opts.rel);
  return async () => {
    const current = await readText(file);
    let status: InitStatus;
    if (current == null) status = 'create';
    else if (opts.createOnly || current === opts.content) status = 'skip';
    else status = 'update';
    return {
      group: opts.group,
      title: opts.title,
      target: opts.rel,
      status,
      apply: async () => {
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, opts.content);
      },
    };
  };
}

/** Build an action that ensures a `tool = "latest"` line exists in mise.toml's [tools] block. */
function miseToolAction(opts: {
  cwd: string;
  tool: string;
  title: string;
}): () => Promise<InitAction> {
  const rel = 'mise.toml';
  const file = path.join(opts.cwd, rel);
  const line = `${opts.tool} = "latest"`;
  return async () => {
    const existing = await readText(file);
    const hasTool = existing?.match(new RegExp(`^\\s*${opts.tool}\\s*=`, 'm')) != null;
    const status: InitStatus = hasTool ? 'skip' : existing ? 'update' : 'create';
    return {
      group: 'Tools',
      title: opts.title,
      target: rel,
      status,
      // Re-read at apply time, not the plan-time `existing` snapshot — two
      // miseToolAction()s target the same file, so the second one applying
      // must see the first one's just-written line, not overwrite it.
      apply: async () => {
        const current = await readText(file);
        if (current == null) {
          await writeFile(file, `[tools]\n${line}\n`);
          return;
        }
        if (current.match(new RegExp(`^\\s*${opts.tool}\\s*=`, 'm'))) return;
        if (current.includes('[tools]')) {
          await writeFile(file, current.replace(/\[tools\]\s*\n/, `[tools]\n${line}\n`));
        } else {
          await writeFile(file, `[tools]\n${line}\n\n${current.trimStart()}`);
        }
      },
    };
  };
}

const DEFAULT_AGENTS_MD = `# Agent Guidelines

This repository is set up for AI-assisted development with fabster.

- Prefer the project's task runner and conventions over ad-hoc commands.
- Skills live in \`.agents/skills\` and \`.claude/skills\`.
- MCP servers are configured per assistant (.mcp.json, .gemini, opencode.json, .cursor, .codex).
`;

const DEFAULT_CLAUDE_MD = `# Claude Code Instructions

See [AGENTS.md](./AGENTS.md) for shared agent guidelines.
`;

function skillSlug(skill: CatalogSkill): string {
  const fromId = skill.id.split(':')[1];
  return fromId ?? skill.name.toLowerCase();
}

/**
 * Build the full list of init actions for a repo. Statuses are computed up
 * front so a caller can preview before applying.
 */
export async function planInit(cwd: string = process.cwd()): Promise<InitAction[]> {
  const { skills } = await loadCatalog();

  const factories: Array<() => Promise<InitAction>> = [
    // --- MCP servers, one per assistant in its own config format ---
    jsonMcpAction({
      title: 'Claude Code',
      cwd,
      rel: '.mcp.json',
      key: 'mcpServers',
      server: { command: MCP_COMMAND, args: MCP_ARGS },
    }),
    jsonMcpAction({
      title: 'Gemini CLI',
      cwd,
      rel: '.gemini/settings.json',
      key: 'mcpServers',
      server: { type: 'stdio', command: MCP_COMMAND, args: MCP_ARGS },
      extra: { contextFileName: 'AGENTS.md' },
    }),
    jsonMcpAction({
      title: 'opencode',
      cwd,
      rel: 'opencode.json',
      key: 'mcp',
      server: { type: 'local', command: [MCP_COMMAND, ...MCP_ARGS], enabled: true },
    }),
    jsonMcpAction({
      title: 'Cursor',
      cwd,
      rel: '.cursor/mcp.json',
      key: 'mcpServers',
      server: { command: MCP_COMMAND, args: MCP_ARGS },
    }),
    codexMcpAction(cwd),
  ];

  // --- Skills: write each plugin SKILL.md into both skill locations ---
  for (const s of skills) {
    if (!s.content) continue;
    const slug = skillSlug(s);
    factories.push(
      fileAction({
        group: 'Skill',
        title: `${s.name} (.claude)`,
        cwd,
        rel: path.join('.claude', 'skills', slug, 'SKILL.md'),
        content: s.content,
      }),
      fileAction({
        group: 'Skill',
        title: `${s.name} (.agents)`,
        cwd,
        rel: path.join('.agents', 'skills', slug, 'SKILL.md'),
        content: s.content,
      }),
    );
  }

  // --- Shared context files (never clobber existing) ---
  factories.push(
    fileAction({
      group: 'Context',
      title: 'AGENTS.md',
      cwd,
      rel: 'AGENTS.md',
      content: DEFAULT_AGENTS_MD,
      createOnly: true,
    }),
    fileAction({
      group: 'Context',
      title: 'CLAUDE.md',
      cwd,
      rel: 'CLAUDE.md',
      content: DEFAULT_CLAUDE_MD,
      createOnly: true,
    }),
    miseToolAction({ cwd, tool: 'node', title: 'mise (node)' }),
    miseToolAction({
      cwd,
      tool: 'nono',
      title: 'mise (nono — required for sandboxed workflow runs)',
    }),
  );

  return Promise.all(factories.map((f) => f()));
}

/** Apply every action that isn't a no-op. Returns how many were applied. */
export async function applyInit(actions: readonly InitAction[]): Promise<number> {
  let applied = 0;
  for (const action of actions) {
    if (action.status === 'skip') continue;
    await action.apply();
    applied++;
  }
  return applied;
}
