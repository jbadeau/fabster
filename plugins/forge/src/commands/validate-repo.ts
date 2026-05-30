import { command, run } from '@fabster/core';

export const validateRepo = command({
  name: 'validate-repo',
  purpose: 'Validate that the repository is in a clean state and prerequisites are installed',
  steps: [
    run('mise --version'),
    run('mise trust --all'),
    run('mise install'),
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
  },
  gates: [],
});
