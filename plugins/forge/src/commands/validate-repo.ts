import { command, run } from '@fabster/core';

export const validateRepo = command({
  name: 'validate-repo',
  purpose: 'Validate that the repository is in a clean state and prerequisites are installed',
  steps: [
    run('git status --porcelain'),
    run('node --version'),
    run('pnpm --version'),
    run('mise --version'),
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'] },
    tools: ['git', 'node', 'pnpm', 'mise'],
  },
  gates: [],
});
