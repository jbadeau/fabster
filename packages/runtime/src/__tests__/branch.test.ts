import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { addWorktree, commitChanges, ensureGitignore } from '../git/branch.js';
import { miseExec } from '../engine/mise.js';

async function initRepo(cwd: string): Promise<void> {
  await miseExec('git init -q', cwd);
  await miseExec('git config user.email t@t.com', cwd);
  await miseExec('git config user.name test', cwd);
  await writeFile(join(cwd, 'seed.txt'), 'seed\n');
  await miseExec('git add -A', cwd);
  await miseExec('git commit -qm init', cwd);
}

describe('ensureGitignore', () => {
  it('creates a default .gitignore for generated workflow state', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-gitignore-'));

    try {
      await ensureGitignore(cwd);

      const content = await readFile(join(cwd, '.gitignore'), 'utf8');

      expect(content).toContain('# Fabster generated state');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.nx/');
      expect(content).toContain('dist/');
      expect(content).toContain('.fabster-worktrees/');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('preserves existing entries while adding missing defaults', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-gitignore-'));

    try {
      await writeFile(join(cwd, '.gitignore'), ['custom/', 'dist/', ''].join('\n'));

      await ensureGitignore(cwd);

      const content = await readFile(join(cwd, '.gitignore'), 'utf8');

      expect(content).toContain('custom/');
      expect(content.match(/^dist\/$/gm)).toHaveLength(1);
      expect(content).toContain('node_modules/');
      expect(content).toContain('.nx/');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

describe('commitChanges', () => {
  it('commits changes and returns the sha', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-commit-'));
    try {
      await initRepo(cwd);
      await writeFile(join(cwd, 'file.txt'), 'content\n');

      const sha = await commitChanges(cwd, 'test: add file');

      expect(sha).toMatch(/^[0-9a-f]{40}$/);
      const log = await miseExec('git log -1 --format=%B', cwd);
      expect(log.stdout.trim()).toBe('test: add file');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('returns null when there is nothing to commit', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-commit-'));
    try {
      await initRepo(cwd);
      // First call also writes and commits the default .gitignore, which
      // is itself a change — settle that before asserting on a clean tree.
      await commitChanges(cwd, 'test: seed gitignore');

      const sha = await commitChanges(cwd, 'test: no-op');

      expect(sha).toBeNull();
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('throws instead of silently discarding work when the worktree is broken', async () => {
    // Regression test: "git status" failing (e.g. a stale/broken worktree
    // registration) used to be read as an empty diff — indistinguishable
    // from "clean" — and the caller's changes were discarded without error.
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-commit-broken-'));
    try {
      // Not a git repository at all — "git status" fails with a non-zero
      // exit code and empty stdout, the exact shape that used to be
      // misread as "nothing to commit".
      await writeFile(join(cwd, 'file.txt'), 'content\n');

      await expect(commitChanges(cwd, 'test: should not silently no-op')).rejects.toThrow(
        /git status failed/,
      );
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

describe('addWorktree', () => {
  it('throws when the target branch does not exist', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-worktree-'));
    try {
      await initRepo(cwd);

      await expect(addWorktree(cwd, 'does-not-exist', 'node-1')).rejects.toThrow(
        /git worktree add failed/,
      );
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('adds a worktree on an existing branch', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-worktree-'));
    try {
      await initRepo(cwd);
      await miseExec('git branch run/test', cwd);

      const worktree = await addWorktree(cwd, 'run/test', 'node-1');

      const status = await miseExec('git status --porcelain', worktree.worktreePath);
      expect(status.exitCode).toBe(0);
    } finally {
      await miseExec(`git worktree remove "${join(cwd, '.fabster-worktrees', 'node-1')}" --force`, cwd).catch(() => {});
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
