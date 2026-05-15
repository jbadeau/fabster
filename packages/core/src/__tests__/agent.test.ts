import { describe, expect, it } from 'vitest';
import { tool } from 'ai';
import { z } from 'zod';
import { agent, claudeCodeAgent, externalAgent } from '../builders/agent.js';
import { provide } from '../builders/capability.js';

describe('agent', () => {
  it('creates an agent definition with tools', () => {
    const a = agent('forge-generator-implementer', {
      purpose: 'Implements Forge generators for any language',
      capabilities: [
        provide('agent.skill', {
          name: 'code-generation',
          language: 'typescript',
        }),
        provide('agent.skill', {
          name: 'testing',
          language: 'typescript',
        }),
      ],
      instructions:
        'You are a code generation agent specializing in Nx monorepo tooling.',
      tools: {
        readFile: tool({
          description: 'Read a file from the workspace',
          parameters: z.object({ path: z.string() }),
          execute: async ({ path }) => `contents of ${path}`,
        }),
        writeFile: tool({
          description: 'Write a file to the workspace',
          parameters: z.object({
            path: z.string(),
            content: z.string(),
          }),
          execute: async ({ path }) => `wrote ${path}`,
        }),
      },
    });

    expect(a.kind).toBe('agent');
    expect(a.name).toBe('forge-generator-implementer');
    expect(a.capabilities).toHaveLength(2);
    expect(a.instructions).toContain('code generation agent');
    expect(a.tools.readFile).toBeDefined();
    expect(a.tools.writeFile).toBeDefined();
  });

  it('creates an external command-backed agent definition', () => {
    const a = externalAgent('local-claude', {
      purpose: 'Runs Claude Code locally',
      capabilities: [
        provide('agent.skill', {
          name: 'code-generation',
          language: 'typescript',
        }),
      ],
      instructions: 'Implement the requested code change.',
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
      purpose: 'Runs Claude Code locally',
      capabilities: [
        provide('agent.skill', {
          name: 'code-generation',
          language: 'typescript',
        }),
      ],
    });

    expect(a.kind).toBe('external-agent');
    expect(a.adapter.command).toBe('claude');
    expect(a.adapter.args).toEqual(['-p', '--max-turns', '30']);
  });
});
