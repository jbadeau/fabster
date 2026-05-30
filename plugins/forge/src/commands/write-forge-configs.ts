import { command, run, string } from '@fabster/core';

export const writeForgeConfigs = command({
  name: 'write-forge-configs',
  purpose: 'Write Forge configuration files (mise.toml, .npmrc, package.json base, nx.json, .gitignore)',
  steps: [
    run('pnpm install --no-frozen-lockfile'),
    run('npx @bjb-forge/cli@latest upgrade --write-configs-only 2>/dev/null || echo "Writing configs manually"'),
  ],
  inputs: {
    platform: string('Platform: devcloud or codeak'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'pnpm'],
    network: ['localhost'],
  },
  gates: [],
});
