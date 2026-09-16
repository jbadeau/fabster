import { describe, expect, it } from 'vitest';
import { claudeCodeAgent, externalAgent } from '../builders/agent.js';
import { provide } from '../builders/capability.js';

describe('agent', () => {
  it('creates an external command-backed agent definition', () => {
    const a = externalAgent('local-claude', {
      role: 'Local Claude Code runner',
      goal: 'Runs Claude Code locally',
      backstory: 'Implement the requested code change.',
      capabilities: [
        provide('agent.skill', {
          name: 'code-generation',
          language: 'typescript',
        }),
      ],
      adapter: {
        kind: 'command',
        command: 'claude',
        args: ['-p'],
      },
    });

    expect(a.kind).toBe('external-agent');
    expect(a.name).toBe('local-claude');
    expect(a.adapter.command).toBe('claude');
    expect(a.adapter.args).toEqual(['-p']);
  });

  it('creates a Claude Code agent with non-interactive defaults', () => {
    const a = claudeCodeAgent('claude', {
      role: 'Local Claude Code runner',
      goal: 'Runs Claude Code locally',
      backstory: 'Implement the requested code change.',
      capabilities: [
        provide('agent.skill', {
          name: 'code-generation',
          language: 'typescript',
        }),
      ],
    });

    expect(a.kind).toBe('external-agent');
    expect(a.adapter.command).toBe('claude');
    expect(a.adapter.args).toEqual(['-p', '{prompt}', '--max-turns', '30']);
  });
});
