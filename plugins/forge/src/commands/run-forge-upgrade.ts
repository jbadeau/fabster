import { command, run, successfulBuild } from '@fabster/core';

export const runForgeUpgrade = command({
  name: 'run-forge-upgrade',
  purpose: 'Run the Forge CLI upgrade command to apply latest migrations',
  steps: [
    run('npm install'),
    run('npx @bjb-forge/cli@latest upgrade'),
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'pnpm'],
    network: ['localhost'],
  },
  gates: [successfulBuild()],
});
