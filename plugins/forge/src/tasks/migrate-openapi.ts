import { task, require, successfulBuild } from '@fabster/core';

export const migrateOpenapi = task({
  name: 'migrate-openapi',
  purpose: 'Migrate OpenAPI specification and generator configuration to Forge conventions',
  requirements: [
    require('agent.skill', { name: 'forge-migration' }),
    require('agent.skill', { name: 'openapi' }),
  ],
  instructions: [
    'Read existing OpenAPI spec files (.openapi.yaml, .openapi.json)',
    'Ensure generator configuration follows Forge OpenAPI plugin conventions',
    'Update any openapi-generator config if present',
  ],
  rules: [],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**/*.openapi.yaml', '/repo/**/*.openapi.json', '/repo/**/openapi-generator-config.yaml'] },
    tools: ['node', 'pnpm'],
  },
  gates: [successfulBuild()],
});
