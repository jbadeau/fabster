import { command, run, successfulBuild } from '@fabster/core';

export const runForgeUpgrade = command({
  name: 'run-forge-upgrade',
  purpose: 'Run the Forge CLI upgrade command to apply latest migrations',
  steps: [
    run('pnpm install --no-frozen-lockfile'),
    run('npx @bjb-forge/cli@latest upgrade'),
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'pnpm'],
    network: ['csa.npm.pkg.sehlat.io', 'registry.npmjs.org'],
    secrets: ['CODEAK_REPOSITORY_BASIC_AUTH'],
  },
  gates: [successfulBuild()],
});
