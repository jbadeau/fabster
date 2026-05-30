import { command, run, successfulBuild } from '@fabster/core';

export const runNxSync = command({
  name: 'run-nx-sync',
  purpose: 'Run nx sync to align generated files with configuration',
  steps: [
    run('pnpm install --no-frozen-lockfile'),
    run('npx nx sync'),
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'pnpm'],
  },
  gates: [successfulBuild()],
});
