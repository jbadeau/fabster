import { command } from '@fabster/core';

export const initWorkspace = command({
  name: 'init-workspace',
  purpose: 'Initialize an Nx TypeScript workspace in the current directory',
  run: [
    'npx nx@latest init --nxCloud=skip --no-interactive',
    'npm install @nx/eslint @nx/eslint-plugin @nx/jest --save-dev',
    'npm install',
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm', 'npx'],
  },
  gates: [],
});
