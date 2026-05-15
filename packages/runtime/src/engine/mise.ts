import { nativeExec } from '@struktoai/mirage-node';

const MISE_BIN = process.env['MISE_BIN'] ?? '/opt/nanobrew/prefix/bin/mise';

/**
 * Provision tools via mise.
 */
export async function provisionTools(
  tools: readonly string[],
  cwd: string,
): Promise<void> {
  // Trust mise config in this directory (worktrees copy mise.toml)
  await nativeExec(`${MISE_BIN} trust`, { cwd });

  if (tools.length === 0) return;

  const toolList = tools.join(' ');
  await nativeExec(`${MISE_BIN} install ${toolList}`, { cwd });
}

/**
 * Wraps a command with `mise exec <tools> --` using specific tool versions.
 * This ensures commands run with the correct tool versions, not system defaults.
 */
export function wrapWithMise(command: string, tools?: readonly string[]): string {
  if (tools && tools.length > 0) {
    const toolArgs = tools.join(' ');
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
  const result = await nativeExec(wrapWithMise(command, tools), { cwd });
  return {
    exitCode: result.exitCode,
    stdout: result.stdoutText,
    stderr: result.stderrText,
  };
}
