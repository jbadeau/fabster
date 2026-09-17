import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@fabster/server', () => ({
  loadCatalog: async () => ({ skills: [] }),
}));

const { planInit, applyInit } = await import('../init.js');

describe('planInit / applyInit — mise.toml tool declarations', () => {
  let cwd: string;

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(tmpdir(), 'fabster-init-test-'));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('declares both node and nono as create actions in a fresh repo', async () => {
    const actions = await planInit(cwd);
    const mise = actions.filter((a) => a.group === 'Tools');
    expect(mise.map((a) => a.status)).toEqual(['create', 'create']);

    await applyInit(actions);
    const content = await readFile(path.join(cwd, 'mise.toml'), 'utf-8');
    expect(content).toMatch(/^\s*node\s*=\s*"latest"/m);
    expect(content).toMatch(/^\s*nono\s*=\s*"latest"/m);
  });

  it('writing node then nono into the same fresh file does not clobber the first write', async () => {
    // Regression: both actions target mise.toml. Each apply() must re-read
    // the file rather than rely on the plan-time `existing` snapshot, or
    // the second action's apply overwrites the first action's write.
    const actions = await planInit(cwd);
    await applyInit(actions);
    const content = await readFile(path.join(cwd, 'mise.toml'), 'utf-8');
    const toolLines = content.split('\n').filter((l) => l.includes('= "latest"'));
    expect(toolLines).toHaveLength(2);
  });

  it('skips a tool already declared and leaves other entries untouched', async () => {
    const first = await applyInit(await planInit(cwd));
    expect(first).toBeGreaterThan(0);

    const second = await planInit(cwd);
    const mise = second.filter((a) => a.group === 'Tools');
    expect(mise.every((a) => a.status === 'skip')).toBe(true);

    const before = await readFile(path.join(cwd, 'mise.toml'), 'utf-8');
    await applyInit(second);
    const after = await readFile(path.join(cwd, 'mise.toml'), 'utf-8');
    expect(after).toBe(before);
  });
});
