import { command } from '@fabster/core';

export const initWorkspace = command({
  name: 'init-workspace',
  purpose: 'Initialize an Nx workspace in the current directory using nx init',
  run: [
    'npm init -y',
    'npx nx@latest init --nxCloud=skip --useDotNxInstallation=false --no-interactive',
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm', 'npx'],
  },
  gates: [],
});
