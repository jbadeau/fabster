import { nativeExec } from '@struktoai/mirage-node';

const MISE_BIN = process.env['MISE_BIN'] ?? '/opt/nanobrew/prefix/bin/mise';

/**
 * Provision tools via mise.
 */
export async function provisionTools(
  tools: readonly string[],
  cwd: string,
): Promise<void> {
  if (tools.length === 0) return;

  const toolList = tools.join(' ');
  await nativeExec(`${MISE_BIN} install ${toolList}`, { cwd });
}

/**
 * Wraps a command with mise exec using the full binary path.
 */
export function wrapWithMise(command: string): string {
  return `${MISE_BIN} exec -- ${command}`;
}

/**
 * Execute a command natively on the host OS, wrapped with mise.
 */
export async function miseExec(
  command: string,
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const result = await nativeExec(wrapWithMise(command), { cwd });
  return {
    exitCode: result.exitCode,
    stdout: result.stdoutText,
    stderr: result.stderrText,
  };
}
