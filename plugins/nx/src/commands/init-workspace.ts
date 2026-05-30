import { command, string, run } from '@fabster/core';

export const initWorkspace = command({
  name: 'init-workspace',
  purpose: 'Initialize an Nx workspace in the current directory using nx init',
  steps: [
    run('npm init -y'),
    run('npm pkg set name=@{name}/source'),
    run('npm pkg set private=true'),
    run('npx nx@latest init --nxCloud=skip --useDotNxInstallation=false --no-interactive'),
  ],
  inputs: {
    name: string('Workspace name'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm'],
  },
  gates: [],
});
