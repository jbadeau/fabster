import { task, require, successfulBuild } from '@fabster/core';

export const migrateStorybook = task({
  name: 'migrate-storybook',
  purpose: 'Migrate Storybook configuration to Forge conventions',
  requirements: [
    require('agent.skill', { name: 'forge-migration' }),
  ],
  instructions: [
    'Read existing .storybook/ configuration',
    'Ensure Storybook config follows Forge conventions',
    'Update any deprecated Storybook settings',
  ],
  rules: [],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/.storybook/**', '/repo/**/.storybook/**'] },
    tools: ['node', 'pnpm'],
  },
  gates: [successfulBuild()],
});
