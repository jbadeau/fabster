import { describe, expect, it } from 'vitest';
import { externalAgent, task, string, require, provide, successfulBuild } from '@fabster/core';
import { resolveAgent } from '../resolver/agent-resolver.js';

const dummyAdapter = { kind: 'command', command: 'echo' } as const;

const tsAgent = externalAgent('ts-agent', {
  role: 'TypeScript agent',
  goal: 'Generate TypeScript code',
  backstory: 'You generate TypeScript code.',
  capabilities: [
    provide('agent.skill', { name: 'code-generation', language: 'typescript' }),
    provide('agent.skill', { name: 'testing', language: 'typescript' }),
  ],
  adapter: dummyAdapter,
});

const pyAgent = externalAgent('py-agent', {
  role: 'Python agent',
  goal: 'Generate Python code',
  backstory: 'You generate Python code.',
  capabilities: [
    provide('agent.skill', { name: 'code-generation', language: 'python' }),
  ],
  adapter: dummyAdapter,
});

const externalTsAgent = externalAgent('external-ts-agent', {
  role: 'External TypeScript agent',
  goal: 'Generate TypeScript code via an external CLI',
  backstory: 'You generate TypeScript code.',
  capabilities: [
    provide('agent.skill', { name: 'code-generation', language: 'typescript' }),
    provide('agent.skill', { name: 'testing', language: 'typescript' }),
  ],
  adapter: {
    kind: 'command',
    command: 'claude',
    args: ['-p'],
  },
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
      post: [successfulBuild()],
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
      post: [successfulBuild()],
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
      post: [successfulBuild()],
    });

    const result = resolveAgent(t, [pyAgent]);
    expect(result?.name).toBe('py-agent');
  });

  it('can resolve an external agent by capabilities', () => {
    const t = task({
      name: 'impl',
      purpose: 'Implement',
      requirements: [
        require('agent.skill', { name: 'code-generation', language: 'typescript' }),
      ],
      inputs: { name: string() },
      post: [successfulBuild()],
    });

    const result = resolveAgent(t, [pyAgent, externalTsAgent]);
    expect(result?.kind).toBe('external-agent');
    expect(result?.name).toBe('external-ts-agent');
  });
});
