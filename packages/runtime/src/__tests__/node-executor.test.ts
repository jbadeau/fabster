import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { command, externalAgent, provide, require, run, successfulBuild, task } from '@fabster/core';
import { executeNode } from '../engine/node-executor.js';
import type { ResolvedNode } from '../types.js';

function node(definition: ResolvedNode['definition']): ResolvedNode {
  return { id: definition.name, definition, inputs: {}, dependsOn: [] };
}

describe('executeNode', () => {
  let cwd: string;

  beforeAll(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'fabster-node-executor-'));
  });

  afterAll(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  it('fails a command whose exit code is non-zero', async () => {
    const def = command({
      name: 'fail-cmd',
      purpose: 'Always fail',
      steps: [run('exit 7')],
      inputs: {},
    });

    const result = await executeNode(node(def), {}, [], cwd);

    expect(result.success).toBe(false);
  });

  it('succeeds a command whose exit code is zero', async () => {
    const def = command({
      name: 'ok-cmd',
      purpose: 'Always succeed',
      steps: [run('exit 0')],
      inputs: {},
    });

    const result = await executeNode(node(def), {}, [], cwd);

    expect(result.success).toBe(true);
  });

  it('treats a task agent exit code as advisory, not as node failure', async () => {
    const agent = externalAgent('crashy', {
      role: 'Fake agent',
      goal: 'Exit non-zero after consuming the prompt',
      backstory: 'Testing self-report handling.',
      capabilities: [provide('agent.skill', { name: 'code-generation' })],
      adapter: {
        kind: 'command',
        command: process.execPath,
        args: [
          '-e',
          "process.stdin.resume(); process.stdin.on('end', () => process.exit(3));",
        ],
      },
    });

    const def = task({
      name: 'impl',
      purpose: 'Implement something',
      requirements: [require('agent.skill', { name: 'code-generation' })],
      inputs: {},
      post: [successfulBuild()],
    });

    const result = await executeNode(node(def), {}, [agent], cwd);

    expect(result.success).toBe(true);
    expect(result.logs.some((l) => l.includes('[advisory] agent exited 3'))).toBe(true);
  });

  it('fails a task when no agent satisfies its requirements', async () => {
    const def = task({
      name: 'unresolvable',
      purpose: 'Needs a skill no agent provides',
      requirements: [require('agent.skill', { name: 'does-not-exist' })],
      inputs: {},
      post: [successfulBuild()],
    });

    const result = await executeNode(node(def), {}, [], cwd);

    expect(result.success).toBe(false);
  });
});
