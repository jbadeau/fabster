import { command, run } from '@fabster/core';

export const installDependencies = command({
  name: 'install-dependencies',
  purpose: 'Install npm dependencies via pnpm',
  steps: [
    run('pnpm install --no-frozen-lockfile'),
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'pnpm'],
    secrets: ['CODEAK_REPOSITORY_BASIC_AUTH'],
  },
  gates: [],
});
