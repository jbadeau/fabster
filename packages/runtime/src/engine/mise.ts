import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function nativeExec(
  command: string,
  options: { cwd: string; env: Record<string, string> },
): Promise<{ exitCode: number; stdoutText: string; stderrText: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', command], {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ exitCode: code ?? 1, stdoutText: stdout, stderrText: stderr });
    });
  });
}

const MISE_BIN = process.env['MISE_BIN'] ?? '/opt/nanobrew/prefix/bin/mise';
const SYSTEM_PATHS = [
  '/usr/local/bin',
  '/System/Cryptexes/App/usr/bin',
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
];

function nativeEnv(): Record<string, string> {
  const env = { ...process.env } as Record<string, string>;
  const path = env['PATH'] ?? '';
  const parts = path.split(':').filter(Boolean);

  for (const systemPath of SYSTEM_PATHS) {
    if (!parts.includes(systemPath)) {
      parts.push(systemPath);
    }
  }

  env['PATH'] = parts.join(':');
  return env;
}

function normalizeTools(tools: readonly string[]): string[] {
  const normalized = new Set<string>();

  for (const tool of tools) {
    const [name] = tool.split('@', 1);
    normalized.add(name === 'npx' ? 'npm' : tool);
  }

  return [...normalized];
}

function parseToolSpec(tool: string): { name: string; version: string } {
  const at = tool.indexOf('@');
  if (at === -1) {
    return { name: tool, version: 'latest' };
  }

  return {
    name: tool.slice(0, at),
    version: tool.slice(at + 1) || 'latest',
  };
}

export async function ensureMiseToml(
  tools: readonly string[],
  cwd: string,
): Promise<void> {
  const miseTomlPath = join(cwd, 'mise.toml');
  const requestedTools = normalizeTools(tools).map(parseToolSpec);

  let content = '';
  try {
    content = await readFile(miseTomlPath, 'utf8');
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error;
    }
  }

  const lines = content.trimEnd().split('\n').filter((line) => line.length > 0);
  let toolsHeaderIndex = lines.findIndex((line) => line.trim() === '[tools]');

  if (toolsHeaderIndex === -1) {
    if (lines.length > 0) {
      lines.push('');
    }
    toolsHeaderIndex = lines.length;
    lines.push('[tools]');
  }

  for (const { name, version } of requestedTools) {
    const toolLine = `${name} = ${JSON.stringify(version)}`;
    let updated = false;

    for (let i = toolsHeaderIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.trim().startsWith('[')) {
        break;
      }

      if (line.match(new RegExp(`^\\s*${name}\\s*=`))) {
        lines[i] = toolLine;
        updated = true;
        break;
      }
    }

    if (!updated) {
      let insertAt = toolsHeaderIndex + 1;
      while (insertAt < lines.length && !lines[insertAt].trim().startsWith('[')) {
        insertAt += 1;
      }
      lines.splice(insertAt, 0, toolLine);
    }
  }

  await writeFile(miseTomlPath, `${lines.join('\n')}\n`);
}

/**
 * Provision tools via mise.
 */
export async function provisionTools(
  tools: readonly string[],
  cwd: string,
): Promise<void> {
  await ensureMiseToml(tools, cwd);

  // Trust mise config in this directory (worktrees copy mise.toml)
  await nativeExec(`${MISE_BIN} trust`, { cwd, env: nativeEnv() });

  if (tools.length === 0) return;

  const toolList = normalizeTools(tools).join(' ');
  await nativeExec(`${MISE_BIN} install ${toolList}`, { cwd, env: nativeEnv() });
}

/**
 * Wraps a command with `mise exec <tools> --` using specific tool versions.
 * This ensures commands run with the correct tool versions, not system defaults.
 */
export function wrapWithMise(command: string, tools?: readonly string[]): string {
  if (tools && tools.length > 0) {
    const toolArgs = normalizeTools(tools).join(' ');
    return `${MISE_BIN} exec ${toolArgs} -- ${command}`;
  }
  return `${MISE_BIN} exec -- ${command}`;
}

/**
 * Execute a command natively on the host OS, wrapped with mise.
 */
export async function miseExec(
  command: string,
  cwd: string,
  tools?: readonly string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  if (tools && tools.length > 0) {
    await ensureMiseToml(tools, cwd);
  }

  const result = await nativeExec(wrapWithMise(command, tools), {
    cwd,
    env: nativeEnv(),
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdoutText,
    stderr: result.stderrText,
  };
}
