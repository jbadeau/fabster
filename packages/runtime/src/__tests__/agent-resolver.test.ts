import { describe, expect, it } from 'vitest';
import { tool } from 'ai';
import { z } from 'zod';
import { agent, task, string, require, provide, successfulBuild } from '@fabster/core';
import { resolveAgent } from '../resolver/agent-resolver.js';

const dummyTools = {
  noop: tool({
    description: 'no-op',
    parameters: z.object({}),
    execute: async () => 'ok',
  }),
};

const tsAgent = agent('ts-agent', {
  purpose: 'TypeScript agent',
  capabilities: [
    provide('agent.skill', { name: 'code-generation', language: 'typescript' }),
    provide('agent.skill', { name: 'testing', language: 'typescript' }),
  ],
  instructions: 'You generate TypeScript code.',
  tools: dummyTools,
});

const pyAgent = agent('py-agent', {
  purpose: 'Python agent',
  capabilities: [
    provide('agent.skill', { name: 'code-generation', language: 'python' }),
  ],
  instructions: 'You generate Python code.',
  tools: dummyTools,
});

describe('resolveAgent', () => {
  it('resolves an agent matching all requirements', () => {
    const t = task({
      name: 'impl',
      purpose: 'Implement',
      requirements: [
        require('agent.skill', { name: 'code-generation', language: 'typescript' }),
        require('agent.skill', { name: 'testing' }),
      ],
      inputs: { name: string() },
      gates: [successfulBuild()],
    });

    const result = resolveAgent(t, [pyAgent, tsAgent]);
    expect(result?.name).toBe('ts-agent');
  });

  it('returns null when no agent matches', () => {
    const t = task({
      name: 'impl',
      purpose: 'Implement',
      requirements: [
        require('agent.skill', { name: 'code-generation', language: 'rust' }),
      ],
      inputs: { name: string() },
      gates: [successfulBuild()],
    });

    const result = resolveAgent(t, [pyAgent, tsAgent]);
    expect(result).toBeNull();
  });

  it('skips optional requirements when matching', () => {
    const t = task({
      name: 'impl',
      purpose: 'Implement',
      requirements: [
        require('agent.skill', { name: 'code-generation', language: 'python' }),
        require('agent.skill', { name: 'refactoring' }, { optional: true }),
      ],
      inputs: { name: string() },
      gates: [],
    });

    const result = resolveAgent(t, [pyAgent]);
    expect(result?.name).toBe('py-agent');
  });
});
