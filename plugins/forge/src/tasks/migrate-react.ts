import { task, require, successfulBuild } from '@fabster/core';

export const migrateReact = task({
  name: 'migrate-react',
  purpose: 'Migrate React and Vite configuration to Forge conventions',
  requirements: [
    require('agent.skill', { name: 'forge-migration' }),
    require('agent.skill', { name: 'react' }),
  ],
  instructions: [
    'Read existing vite.config.ts and vitest.config.ts',
    'Ensure vitest config has watch: false in test block',
    'Update React dependencies to versions compatible with Forge',
    'Create vite package.json if missing for proper Nx project detection',
  ],
  rules: [
    'vitest.config.ts must have watch: false',
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**/vite.config.ts', '/repo/**/vitest.config.ts', '/repo/**/package.json'] },
    tools: ['node', 'pnpm'],
  },
  gates: [successfulBuild()],
});
