import { describe, expect, it } from 'vitest';
import { command, run } from '../builders/command.js';
import { boolean, string } from '../builders/io.js';
import { linted, successfulBuild } from '../builders/gate.js';

describe('command', () => {
  it('creates a command definition', () => {
    const cmd = command({
      name: 'create-react-library',
      purpose: 'Create a React library in the monorepo',
      steps: [run('nx generate @forge/react:library --name={name} --scope={scope}')],
      inputs: {
        name: string(),
        scope: string(),
        publishable: boolean(),
      },
      permissions: {
        fs: { read: ['/repo/**'], write: ['/repo/packages/**'] },
        tools: ['nx@22', 'pnpm@10', 'git'],
      },
      post: [successfulBuild(), linted()],
    });

    expect(cmd.kind).toBe('command');
    expect(cmd.name).toBe('create-react-library');
    expect(cmd.inputs.name.kind).toBe('string');
    expect(cmd.inputs.publishable.kind).toBe('boolean');
    expect(cmd.permissions?.tools).toEqual(['nx@22', 'pnpm@10', 'git']);
    expect(cmd.post).toHaveLength(2);
  });

  it('accepts multiple steps', () => {
    const cmd = command({
      name: 'multi-step',
      purpose: 'Run multiple steps',
      steps: [run('npm install'), run('npm run build')],
      inputs: {},
    });

    expect(cmd.steps.map((s) => s.script)).toEqual([
      'npm install',
      'npm run build',
    ]);
  });
});
