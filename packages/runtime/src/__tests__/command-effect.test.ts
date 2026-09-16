import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { command, jsonMerge, run, string } from '@fabster/core';
import { commandEffect } from '../effects/command.js';

describe('commandEffect — jsonMerge step', () => {
  it('deep-merges the patch into the target file, in place', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-jsonmerge-'));
    try {
      await writeFile(
        join(cwd, 'tsconfig.lib.json'),
        JSON.stringify({ compilerOptions: { rootDir: 'src', strict: true } }),
      );

      const cmd = command({
        name: 'patch',
        purpose: 'patch tsconfig',
        steps: [
          jsonMerge('{libDir}/tsconfig.lib.json', {
            compilerOptions: { lib: ['es2022', 'dom'], strict: false },
          }),
        ],
        inputs: { libDir: string() },
      });

      const result = await commandEffect(cmd, { libDir: '.' }).execute({ cwd });

      expect(result.executed).toBe(true);
      const written = JSON.parse(await readFile(join(cwd, 'tsconfig.lib.json'), 'utf8'));
      expect(written).toEqual({
        compilerOptions: { rootDir: 'src', strict: false, lib: ['es2022', 'dom'] },
      });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('fails the step instead of throwing when the target file is missing', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-jsonmerge-missing-'));
    try {
      const cmd = command({
        name: 'patch',
        purpose: 'patch tsconfig',
        steps: [jsonMerge('does-not-exist.json', { a: 1 })],
        inputs: {},
      });

      const result = await commandEffect(cmd, {}).execute({ cwd });

      expect(result.executed).toBe(false);
      expect(result.advisory).toMatch(/ENOENT|no such file/i);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('does not shell out for a jsonMerge-only command', async () => {
    // Regression guard for the sandbox-leak this step replaces: a jsonMerge
    // step must never spawn a process (mise/nono) — it only ever touches
    // files already inside the worktree via plain fs calls.
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-jsonmerge-noexec-'));
    try {
      await writeFile(join(cwd, 'pkg.json'), JSON.stringify({ name: 'x' }));

      const cmd = command({
        name: 'patch-only',
        purpose: 'patch only, no shell steps',
        steps: [jsonMerge('pkg.json', { version: '1.0.0' })],
        inputs: {},
      });

      const result = await commandEffect(cmd, {}).execute({ cwd });

      expect(result.executed).toBe(true);
      expect(result.logs.some((l) => l.includes('merge pkg.json'))).toBe(true);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

describe('commandEffect — mixed run + jsonMerge steps', () => {
  it('interpolates inputs in the jsonMerge path the same as run steps', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-jsonmerge-interp-'));
    try {
      await writeFile(join(cwd, 'config.json'), JSON.stringify({ existing: true }));

      const cmd = command({
        name: 'patch-config',
        purpose: 'patch config with interpolated path',
        steps: [
          run('true'),
          jsonMerge('{fileName}', { added: true }),
        ],
        inputs: { fileName: string() },
      });

      const result = await commandEffect(cmd, { fileName: 'config.json' }).execute({ cwd });

      expect(result.executed).toBe(true);
      const written = JSON.parse(await readFile(join(cwd, 'config.json'), 'utf8'));
      expect(written).toEqual({ existing: true, added: true });
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
