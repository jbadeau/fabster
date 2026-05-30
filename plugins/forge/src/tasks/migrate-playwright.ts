import { task, require, successfulBuild } from '@fabster/core';

export const migratePlaywright = task({
  name: 'migrate-playwright',
  purpose: 'Migrate Playwright configuration to Forge conventions',
  requirements: [
    require('agent.skill', { name: 'forge-migration' }),
  ],
  instructions: [
    'Read existing playwright.config.ts',
    'Ensure configuration follows Forge Playwright plugin conventions',
    'Update any test directory structure if needed',
  ],
  rules: [],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**/playwright.config.ts'] },
    tools: ['node', 'pnpm'],
  },
  gates: [successfulBuild()],
});
