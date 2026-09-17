import { describe, expect, it } from 'vitest';
import { command, jsonMerge, run, use } from '../builders/command.js';
import { boolean, string } from '../builders/io.js';
import { linted, successfulBuild } from '../builders/gate.js';

describe('command', () => {
  it('creates a command definition', () => {
    const cmd = command({
      name: 'create-react-library',
      purpose: 'Create a React library in the monorepo',
      steps: [
        run('nx generate @forge/react:library --name={name} --scope={scope}'),
      ],
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

    expect(cmd.steps.map((s) => (s._tag === 'run' ? s.script : s))).toEqual([
      'npm install',
      'npm run build',
    ]);
  });

  it('accepts a jsonMerge step alongside run steps', () => {
    const cmd = command({
      name: 'patch-tsconfig',
      purpose: 'Relax the generated client tsconfig',
      steps: [
        run('npm install'),
        jsonMerge('{libDir}/tsconfig.lib.json', {
          compilerOptions: { lib: ['es2022', 'dom'] },
        }),
      ],
      inputs: { libDir: string() },
    });

    expect(cmd.steps[0]._tag).toBe('run');
    expect(cmd.steps[1]).toEqual({
      _tag: 'jsonMerge',
      path: '{libDir}/tsconfig.lib.json',
      patch: { compilerOptions: { lib: ['es2022', 'dom'] } },
    });
  });

  it('inlines another command via use()', () => {
    const npmInstall = command({
      name: 'npm-install',
      purpose: 'Install npm dependencies',
      steps: [run('npm install')],
      inputs: {},
    });

    const cmd = command({
      name: 'generate-app',
      purpose: 'Generate an app',
      steps: [use(npmInstall, {}), run('npx nx generate {generator}')],
      inputs: { generator: string() },
    });

    expect(cmd.steps[0]).toEqual({
      _tag: 'use',
      command: npmInstall,
      inputs: {},
    });
    expect(cmd.steps[1]._tag).toBe('run');
  });
});
