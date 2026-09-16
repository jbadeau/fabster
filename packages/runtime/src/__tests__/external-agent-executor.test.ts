import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { externalAgent, provide, require, string, successfulBuild, task } from '@fabster/core';
import { externalAgentEffect } from '../effects/external-agent.js';

describe('executeExternalAgentTask', () => {
  it('pipes a Fabster task prompt into a command-backed agent', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-external-agent-'));

    try {
      const agent = externalAgent('fake-claude', {
        role: 'Fake command agent',
        goal: 'Echo the task prompt back for testing',
        backstory: 'Use the local adapter.',
        capabilities: [
          provide('agent.skill', {
            name: 'code-generation',
            language: 'typescript',
          }),
        ],
        adapter: {
          kind: 'command',
          command: process.execPath,
          args: [
            '-e',
            [
              "const fs = require('node:fs');",
              "let input = '';",
              "process.stdin.setEncoding('utf8');",
              "process.stdin.on('data', chunk => { input += chunk; });",
              "process.stdin.on('end', () => {",
              "  fs.writeFileSync('received-prompt.txt', input);",
              "  console.log('adapter complete');",
              '});',
            ].join(' '),
          ],
        },
      });

      const t = task({
        name: 'impl',
        purpose: 'Implement a button component',
        requirements: [
          require('agent.skill', {
            name: 'code-generation',
            language: 'typescript',
          }),
        ],
        inputs: { component: string() },
        post: [successfulBuild()],
      });

      const effect = externalAgentEffect(t, agent, { component: 'Button' });
      const result = await effect.execute({ cwd });

      const prompt = await readFile(join(cwd, 'received-prompt.txt'), 'utf8');

      expect(result.executed).toBe(true);
      expect(result.logs.join('\n')).toContain('adapter complete');
      expect(prompt).toContain('Implement a button component');
      expect(prompt).toContain('- component: Button');
      expect(prompt).toContain('Do not create commits');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
