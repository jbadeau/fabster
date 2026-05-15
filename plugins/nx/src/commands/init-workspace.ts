import { command, string } from '@fabster/core';

export const initWorkspace = command({
  name: 'init-workspace',
  purpose: 'Initialize an Nx workspace in the current directory using nx init',
  run: [
    'npm init -y',
    'npm pkg set name=@{name}/source',
    'npm pkg set private=true',
    'npx nx@latest init --nxCloud=skip --useDotNxInstallation=false --no-interactive',
  ],
  inputs: {
    name: string('Workspace name'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm', 'npx'],
  },
  gates: [],
});
