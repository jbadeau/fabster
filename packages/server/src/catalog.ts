import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type {
  TaskDefinition,
  CommandDefinition,
  SkillDefinition,
  RuleDefinition,
  AgentDefinition,
  Capability,
  Requirement,
  Gate,
  IOSchema,
  Permissions,
} from '@fabster/core';

// Framework packages under the @fabster scope that are NOT plugins.
const FRAMEWORK_PACKAGES = new Set(['core', 'runtime', 'server', 'cli', 'dashboard']);

// Nicer display names for known plugins; falls back to capitalized slug.
const CATEGORY_LABELS: Record<string, string> = {
  nx: 'Nx',
  openapi: 'OpenAPI',
  forge: 'Forge',
};

export interface CatalogIO {
  name: string;
  kind: string;
  description?: string;
  required?: boolean;
  array?: boolean;
}

export interface CatalogApiAccess {
  name: string;
  baseUrl?: string;
  scopes?: string[];
}

export interface CatalogExternalSystemAccess {
  name: string;
  kind?: string;
  host?: string;
}

export interface CatalogPermissions {
  fs?: { read?: string[]; write?: string[] };
  tools?: string[];
  network?: string[];
  apis?: CatalogApiAccess[];
  externalSystems?: CatalogExternalSystemAccess[];
  secrets?: string[];
}

export interface CatalogRequirement {
  namespace: string;
  filter: Record<string, string | number | boolean | readonly string[]>;
  optional?: boolean;
}

export interface CatalogTask {
  id: string;
  slug: string;
  name: string;
  purpose: string;
  reasoning: 'low' | 'medium' | 'high';
  requirements: CatalogRequirement[];
  category: string;
  provider: string;
  gates: string[];
  inputs?: CatalogIO[];
  outputs?: CatalogIO[];
  instructions?: string[];
  rules?: string[];
  permissions?: CatalogPermissions;
}

export interface CatalogCommand {
  id: string;
  slug: string;
  name: string;
  description: string;
  run: string;
  category: string;
  provider: string;
  tools: string[];
  steps?: string[];
  inputs?: CatalogIO[];
  outputs?: CatalogIO[];
  gates?: string[];
  permissions?: CatalogPermissions;
}

export interface CatalogSkill {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  provider: string;
  content?: string;
}

export interface CatalogRule {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  severity: 'blocking' | 'non-blocking';
  provider: string;
}

export interface CatalogCapability {
  namespace: string;
  attributes: Record<string, string | number | boolean | string[]>;
}

export interface CatalogAgent {
  id: string;
  slug: string;
  name: string;
  kind: 'native' | 'external';
  role: string;
  goal: string;
  backstory: string;
  capabilities: CatalogCapability[];
  memory?: boolean;
  allowDelegation?: boolean;
  /** Tool names for native agents (Vercel AI SDK ToolSet keys). */
  tools?: string[];
  /** Shell adapter for external agents (e.g. Claude Code CLI). */
  adapter?: { command: string; args?: string[]; timeoutMs?: number };
  category: string;
  provider: string;
}

interface PluginModule {
  [exportName: string]: unknown;
}

function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

function serializeRequirement(req: Requirement): CatalogRequirement {
  return {
    namespace: req.namespace,
    filter: { ...req.filter },
    ...(req.optional != null ? { optional: req.optional } : {}),
  };
}

function gateLabels(gates: readonly Gate[] | undefined): string[] {
  return gates?.map((g) => g.kind) ?? [];
}

function serializeIO(schema: IOSchema | undefined): CatalogIO[] | undefined {
  if (!schema) return undefined;
  const entries = Object.entries(schema).map(([name, descriptor]) => ({
    name,
    kind: descriptor.kind,
    description: descriptor.description,
    required: descriptor.required,
    array: descriptor.array,
  }));
  return entries.length > 0 ? entries : undefined;
}

function serializePermissions(
  permissions: Permissions | undefined,
): CatalogPermissions | undefined {
  if (!permissions) return undefined;
  return {
    fs: permissions.fs
      ? {
          read: permissions.fs.read ? [...permissions.fs.read] : undefined,
          write: permissions.fs.write ? [...permissions.fs.write] : undefined,
        }
      : undefined,
    tools: permissions.tools ? [...permissions.tools] : undefined,
    network: permissions.network ? [...permissions.network] : undefined,
    apis: permissions.apis
      ? permissions.apis.map((a) => ({
          name: a.name,
          baseUrl: a.baseUrl,
          scopes: a.scopes ? [...a.scopes] : undefined,
        }))
      : undefined,
    externalSystems: permissions.externalSystems
      ? permissions.externalSystems.map((s) => ({
          name: s.name,
          kind: s.kind,
          host: s.host,
        }))
      : undefined,
    secrets: permissions.secrets ? [...permissions.secrets] : undefined,
  };
}

function isTask(value: unknown): value is TaskDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'task'
  );
}

function isCommand(value: unknown): value is CommandDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'command'
  );
}

function isSkill(value: unknown): value is SkillDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'skill'
  );
}

function isRule(value: unknown): value is RuleDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'rule'
  );
}

function isAgent(value: unknown): value is AgentDefinition {
  if (typeof value !== 'object' || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return kind === 'agent' || kind === 'external-agent';
}

function serializeCapability(cap: Capability): CatalogCapability {
  return { namespace: cap.namespace, attributes: { ...cap.attributes } };
}

function serializeAgent(
  value: AgentDefinition,
  slug: string,
  category: string,
  provider: string,
): CatalogAgent {
  const base = {
    id: `${slug}:${value.name}`,
    slug: value.name,
    name: value.name,
    role: value.role,
    goal: value.goal,
    backstory: value.backstory,
    capabilities: value.capabilities.map(serializeCapability),
    memory: value.memory,
    allowDelegation: value.allowDelegation,
    category,
    provider,
  };
  return {
    ...base,
    kind: 'external',
    adapter: {
      command: value.adapter.command,
      args: value.adapter.args ? [...value.adapter.args] : undefined,
      timeoutMs: value.adapter.timeoutMs,
    },
  };
}

// Discover installed @fabster plugin packages (everything in the scope that
// isn't a framework package).
async function discoverPluginSlugs(): Promise<string[]> {
  const scopeDir = path.join(process.cwd(), 'node_modules', '@fabster');
  try {
    const entries = await readdir(scopeDir);
    return entries.filter((name) => !FRAMEWORK_PACKAGES.has(name) && !name.startsWith('.'));
  } catch {
    return [];
  }
}

async function loadPlugin(slug: string): Promise<PluginModule | null> {
  try {
    // Bare specifier so the package's export conditions (e.g. @fabster/source)
    // resolve the same way they do for workflow files.
    return (await import(`@fabster/${slug}`)) as PluginModule;
  } catch {
    return null;
  }
}

export async function loadCatalog(): Promise<{
  tasks: CatalogTask[];
  commands: CatalogCommand[];
  skills: CatalogSkill[];
  rules: CatalogRule[];
  agents: CatalogAgent[];
}> {
  const slugs = await discoverPluginSlugs();
  const tasks: CatalogTask[] = [];
  const commands: CatalogCommand[] = [];
  const skills: CatalogSkill[] = [];
  const rules: CatalogRule[] = [];
  const agents: CatalogAgent[] = [];

  for (const slug of slugs) {
    const mod = await loadPlugin(slug);
    if (!mod) continue;
    const category = categoryLabel(slug);
    const provider = `@fabster/${slug}`;

    for (const value of Object.values(mod)) {
      if (isTask(value)) {
        tasks.push({
          id: `${slug}:${value.name}`,
          slug: value.name,
          name: value.name,
          purpose: value.purpose,
          reasoning: value.reasoning ?? 'medium',
          requirements: value.requirements.map(serializeRequirement),
          category,
          provider,
          gates: gateLabels([...(value.pre ?? []), ...(value.post ?? [])]),
          inputs: serializeIO(value.inputs),
          outputs: serializeIO(value.outputs),
          instructions: value.instructions ? [...value.instructions] : undefined,
          rules: value.rules ? [...value.rules] : undefined,
          permissions: serializePermissions(value.permissions),
        });
      } else if (isCommand(value)) {
        commands.push({
          id: `${slug}:${value.name}`,
          slug: value.name,
          name: value.name,
          description: value.purpose,
          run: value.steps.map((s) => s.script).join(' && '),
          category,
          provider,
          tools: value.permissions?.tools ? [...value.permissions.tools] : [],
          steps: value.steps.map((s) => s.script),
          inputs: serializeIO(value.inputs),
          outputs: serializeIO(value.outputs),
          gates: gateLabels([...(value.pre ?? []), ...(value.post ?? [])]),
          permissions: serializePermissions(value.permissions),
        });
      } else if (isSkill(value)) {
        skills.push({
          id: `${slug}:${value.name}`,
          slug: value.name,
          name: value.title ?? value.name,
          description: value.description,
          category: value.category,
          tags: [...value.tags],
          provider,
          content: value.content,
        });
      } else if (isRule(value)) {
        rules.push({
          id: `${slug}:${value.name}`,
          slug: value.name,
          name: value.name,
          description: value.description,
          category: value.category,
          severity: value.severity,
          provider,
        });
      } else if (isAgent(value)) {
        agents.push(serializeAgent(value, slug, category, provider));
      }
    }
  }

  tasks.sort((a, b) => a.name.localeCompare(b.name));
  commands.sort((a, b) => a.name.localeCompare(b.name));
  skills.sort((a, b) => a.name.localeCompare(b.name));
  rules.sort((a, b) => a.name.localeCompare(b.name));
  agents.sort((a, b) => a.name.localeCompare(b.name));

  return { tasks, commands, skills, rules, agents };
}
