import path from 'node:path';
import { miseExec } from '../engine/mise.js';

export interface WorktreeInfo {
  readonly branch: string;
  readonly worktreePath: string;
}

/**
 * Create a git worktree for a node. The worktree is a separate directory
 * with its own branch, based on the parent branch.
 */
export async function createWorktree(
  repoCwd: string,
  workflowName: string,
  nodeId: string,
  parentBranch: string,
): Promise<WorktreeInfo> {
  const branch = `fabster/${workflowName}/${nodeId}`;
  const worktreeDir = path.join(repoCwd, '.fabster-worktrees', nodeId);

  // Create the branch from parent
  await miseExec(`git branch ${branch} ${parentBranch}`, repoCwd);

  // Create worktree at the branch
  await miseExec(`git worktree add "${worktreeDir}" ${branch}`, repoCwd);

  return { branch, worktreePath: worktreeDir };
}

/**
 * Commit all changes in a worktree.
 */
export async function commitChanges(
  worktreePath: string,
  message: string,
): Promise<string | null> {
  const status = await miseExec('git status --porcelain', worktreePath);

  if (status.stdout.trim() === '') {
    return null;
  }

  await miseExec('git add -A', worktreePath);
  await miseExec(`git commit -m "${message}"`, worktreePath);

  const result = await miseExec('git rev-parse HEAD', worktreePath);
  return result.stdout.trim();
}

/**
 * Remove a worktree after the node completes.
 */
export async function removeWorktree(
  repoCwd: string,
  worktreePath: string,
): Promise<void> {
  await miseExec(`git worktree remove "${worktreePath}" --force`, repoCwd);
}

/**
 * Check if a branch already exists.
 */
export async function branchExists(
  repoCwd: string,
  branch: string,
): Promise<boolean> {
  const result = await miseExec(`git branch --list "${branch}"`, repoCwd);
  return result.stdout.trim() !== '';
}

/**
 * Ensure the repo has at least one commit so we can create branches.
 */
export async function ensureInitialCommit(repoCwd: string): Promise<void> {
  const hasCommits = await miseExec('git rev-parse HEAD', repoCwd);
  if (hasCommits.exitCode !== 0) {
    await miseExec('git add -A', repoCwd);
    await miseExec('git commit --allow-empty -m "fabster: initial commit"', repoCwd);
  }
}
