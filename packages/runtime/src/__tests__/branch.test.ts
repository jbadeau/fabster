import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ensureGitignore } from '../git/branch.js';

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
