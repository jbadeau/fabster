import { command, string } from '@fabster/core';

export const runTarget = command({
  name: 'run-target',
  purpose: 'Run an Nx target on a project',
  run: 'npx nx run {project}:{target}',
  inputs: {
    project: string('Project name'),
    target: string('Target name, e.g. build, test, lint'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm'],
  },
  gates: [],
});
