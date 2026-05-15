import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ensureMiseToml } from '../engine/mise.js';

describe('ensureMiseToml', () => {
  it('creates mise.toml with requested tools', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-mise-'));

    try {
      await ensureMiseToml(['node@22', 'npm', 'npx', 'java@21'], cwd);

      const content = await readFile(join(cwd, 'mise.toml'), 'utf8');

      expect(content).toContain('[tools]');
      expect(content).toContain('node = "22"');
      expect(content).toContain('npm = "latest"');
      expect(content).toContain('java = "21"');
      expect(content).not.toContain('npx =');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('updates an existing tools section', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-mise-'));

    try {
      await writeFile(
        join(cwd, 'mise.toml'),
        ['[tools]', 'node = "20"', '', '[env]', 'FOO = "bar"', ''].join('\n'),
      );

      await ensureMiseToml(['node@22', 'npm'], cwd);

      const content = await readFile(join(cwd, 'mise.toml'), 'utf8');

      expect(content).toContain('node = "22"');
      expect(content).toContain('npm = "latest"');
      expect(content).toContain('[env]');
      expect(content).toContain('FOO = "bar"');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
