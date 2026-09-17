import { command, string, run, use } from '@fabster/core';
import { npmInstall } from './npm-install.js';

export const runTarget = command({
  name: 'run-target',
  purpose: 'Run an Nx target on a project',
  steps: [use(npmInstall, {}), run('npx nx run {project}:{target}')],
  inputs: {
    project: string('Project name'),
    target: string('Target name, e.g. build, test, lint'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    network: ['registry.npmjs.org'],
    tools: ['node', 'npm'],
  },
});
