import { miseExec } from '../engine/mise.js';

export async function createBranch(
  cwd: string,
  workflowName: string,
  nodeId: string,
  parentBranch: string,
): Promise<string> {
  const branchName = `fabster/${workflowName}/${nodeId}`;

  // Check if repo has any commits
  const hasCommits = await miseExec('git rev-parse HEAD', cwd);
  if (hasCommits.exitCode !== 0) {
    // No commits yet — create initial commit so we can branch
    await miseExec('git add -A', cwd);
    await miseExec('git commit --allow-empty -m "fabster: initial commit"', cwd);
  }

  await miseExec(`git checkout ${parentBranch}`, cwd);
  await miseExec(`git checkout -b ${branchName}`, cwd);

  return branchName;
}

export async function commitChanges(
  cwd: string,
  message: string,
): Promise<string | null> {
  const status = await miseExec('git status --porcelain', cwd);

  if (status.stdout.trim() === '') {
    return null;
  }

  await miseExec('git add -A', cwd);
  await miseExec(`git commit -m "${message}"`, cwd);

  const result = await miseExec('git rev-parse HEAD', cwd);
  return result.stdout.trim();
}

export async function getCurrentBranch(
  cwd: string,
): Promise<string> {
  const result = await miseExec('git branch --show-current', cwd);
  return result.stdout.trim();
}
