import { command, successfulBuild } from '@fabster/core';

export const initWorkspace = command({
  name: 'init-workspace',
  purpose: 'Initialize an Nx TypeScript workspace in the current directory',
  run: [
    'npx nx@latest init --nxCloud=skip --no-interactive',
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm', 'npx'],
  },
  gates: [successfulBuild()],
});
