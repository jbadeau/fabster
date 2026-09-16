import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Read-only investigation: the claude CLI over the repository, producing a
 * findings report. Context continuity, not workspace continuity — the report
 * becomes an input to the fix run, which gets a fresh worktree.
 */
export async function investigateRepo(
  repo: string,
  context: string,
): Promise<string> {
  const prompt = [
    'Investigate this support case read-only. Do not modify any files.',
    '',
    '## Conversation',
    context,
    '',
    'Report: the likely root cause, the files involved, and the evidence.',
    'Be concrete and cite file paths and line numbers.',
  ].join('\n');

  const { stdout } = await execFileAsync(
    'claude',
    ['-p', prompt, '--max-turns', '15'],
    { cwd: repo, maxBuffer: 10 * 1024 * 1024 },
  );
  return stdout.trim();
}
