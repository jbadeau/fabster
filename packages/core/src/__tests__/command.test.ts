import { describe, expect, it } from 'vitest';
import { command } from '../builders/command.js';
import { boolean, string } from '../builders/io.js';
import { linted, successfulBuild } from '../builders/gate.js';

describe('command', () => {
  it('creates a command definition', () => {
    const cmd = command({
      name: 'create-react-library',
      purpose: 'Create a React library in the monorepo',
      run: 'nx generate @forge/react:library --name={name} --scope={scope}',
      inputs: {
        name: string(),
        scope: string(),
        publishable: boolean(),
      },
      permissions: {
        fs: { read: ['/repo/**'], write: ['/repo/packages/**'] },
        tools: ['nx@22', 'pnpm@10', 'git'],
      },
      gates: [successfulBuild(), linted()],
    });

    expect(cmd.kind).toBe('command');
    expect(cmd.name).toBe('create-react-library');
    expect(cmd.inputs.name.kind).toBe('string');
    expect(cmd.inputs.publishable.kind).toBe('boolean');
    expect(cmd.permissions?.tools).toEqual(['nx@22', 'pnpm@10', 'git']);
    expect(cmd.gates).toHaveLength(2);
  });

  it('accepts an array of commands', () => {
    const cmd = command({
      name: 'multi-step',
      purpose: 'Run multiple steps',
      run: ['npm install', 'npm run build'],
      inputs: {},
    });

    expect(cmd.run).toEqual(['npm install', 'npm run build']);
  });
});
