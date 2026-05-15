import { command, string, successfulBuild } from '@fabster/core';

export const addPlugin = command({
  name: 'add-plugin',
  purpose: 'Add an Nx plugin to the workspace',
  run: 'npx nx add {plugin}',
  inputs: {
    plugin: string('Nx plugin package name, e.g. @nx/react'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm', 'npx'],
  },
  gates: [successfulBuild()],
});
