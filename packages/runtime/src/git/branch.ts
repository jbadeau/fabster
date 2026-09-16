import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { miseExec } from '../engine/mise.js';

export interface WorktreeInfo {
  readonly branch: string;
  readonly worktreePath: string;
}

const DEFAULT_GITIGNORE_ENTRIES = [
  'node_modules/',
  '.nx/',
  'dist/',
  'coverage/',
  '.env',
  '.env.*',
  '.DS_Store',
  '.fabster-worktrees/',
  '.fabster/',
];

export async function ensureGitignore(cwd: string): Promise<void> {
  const gitignorePath = path.join(cwd, '.gitignore');

  let content = '';
  try {
    content = await readFile(gitignorePath, 'utf8');
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error;
    }
  }

  const lines = content.trimEnd().split('\n').filter((line) => line.length > 0);
  const existing = new Set(lines.map((line) => line.trim()));
  let changed = false;

  if (!existing.has('# Fabster generated state')) {
    if (lines.length > 0) lines.push('');
    lines.push('# Fabster generated state');
    changed = true;
  }

  for (const entry of DEFAULT_GITIGNORE_ENTRIES) {
    if (!existing.has(entry)) {
      lines.push(entry);
      changed = true;
    }
  }

  if (changed || content === '') {
    await writeFile(gitignorePath, `${lines.join('\n')}\n`);
  }
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

  // Copy gitignored files that are needed in the worktree (e.g., mise.local.toml with env vars)
  const { existsSync, copyFileSync } = await import('node:fs');
  for (const file of ['mise.local.toml', '.mise.local.toml']) {
    const src = path.join(repoCwd, file);
    if (existsSync(src)) {
      copyFileSync(src, path.join(worktreeDir, file));
    }
  }

  return { branch, worktreePath: worktreeDir };
}

/**
 * Create the run branch from the repo's current HEAD.
 */
export async function createRunBranch(
  repoCwd: string,
  branch: string,
): Promise<void> {
  await miseExec(`git branch ${branch}`, repoCwd);
}

/**
 * Add a worktree on an existing branch (the run branch). Nodes share the
 * branch sequentially; each gets its own worktree directory.
 */
export async function addWorktree(
  repoCwd: string,
  branch: string,
  nodeId: string,
): Promise<WorktreeInfo> {
  const worktreeDir = path.join(repoCwd, '.fabster-worktrees', nodeId);

  // A crashed prior attempt may have left a stale worktree — clear it so
  // re-execution starts clean from the run branch. Ignore failure here:
  // there may be nothing to remove.
  await miseExec(`git worktree remove "${worktreeDir}" --force`, repoCwd);

  const add = await miseExec(`git worktree add "${worktreeDir}" ${branch}`, repoCwd);
  if (add.exitCode !== 0) {
    // A silent failure here leaves worktreeDir pointing at nothing (or a
    // stale directory) — the node would appear to run, then commitChanges'
    // "git status" would fail too and get misread as "nothing to commit",
    // discarding all of the node's work without a trace.
    throw new Error(`git worktree add failed: ${add.stderr || add.stdout}`);
  }

  const { existsSync, copyFileSync } = await import('node:fs');
  for (const file of ['mise.local.toml', '.mise.local.toml']) {
    const src = path.join(repoCwd, file);
    if (existsSync(src)) {
      copyFileSync(src, path.join(worktreeDir, file));
    }
  }

  return { branch, worktreePath: worktreeDir };
}

/**
 * Commit all changes in a worktree.
 */
export async function commitChanges(
  worktreePath: string,
  message: string,
): Promise<string | null> {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');

  await ensureGitignore(worktreePath);

  const status = await miseExec('git status --porcelain', worktreePath);
  if (status.exitCode !== 0) {
    // A broken worktree (e.g. a bad or missing worktree registration) makes
    // "git status" fail with empty stdout — indistinguishable from "clean"
    // unless the exit code is checked. Misreading it as clean silently
    // discards the node's work instead of failing the run.
    throw new Error(`git status failed in ${worktreePath}: ${status.stderr || status.stdout}`);
  }

  if (status.stdout.trim() === '') {
    return null;
  }

  const add = await miseExec('git add -A -- .', worktreePath);
  if (add.exitCode !== 0) {
    throw new Error(`git add failed: ${add.stderr || add.stdout}`);
  }

  // The message may contain arbitrary content (quotes, $refs, newlines) —
  // pass it via -F, never through shell interpolation.
  const msgDir = await mkdtemp(path.join(tmpdir(), 'fabster-commit-'));
  const msgFile = path.join(msgDir, 'message');
  try {
    await writeFile(msgFile, message);
    const commit = await miseExec(`git commit -F "${msgFile}"`, worktreePath);
    if (commit.exitCode !== 0) {
      // The commit is the engine's seal — a silent failure here would
      // discard verified work when the worktree is removed.
      throw new Error(`git commit failed: ${commit.stderr || commit.stdout}`);
    }
  } finally {
    await rm(msgDir, { recursive: true, force: true });
  }

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
  await ensureGitignore(repoCwd);

  const hasCommits = await miseExec('git rev-parse HEAD', repoCwd);
  if (hasCommits.exitCode !== 0) {
    await miseExec('git add -A -- .', repoCwd);
    await miseExec('git commit --allow-empty -m "fabster: initial commit"', repoCwd);
  }
}
