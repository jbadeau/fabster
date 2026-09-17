import { command, string, run, use } from '@fabster/core';
import { npmInstall } from './npm-install.js';

export const addPlugin = command({
  name: 'add-plugin',
  purpose: 'Add an Nx plugin to the workspace',
  steps: [use(npmInstall, {}), run('npx nx add {plugin}')],
  inputs: {
    plugin: string('Nx plugin package name, e.g. @nx/react'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm'],
  },
});
