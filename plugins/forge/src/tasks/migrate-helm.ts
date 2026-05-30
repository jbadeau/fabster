import { task, require, string, successfulBuild } from '@fabster/core';

export const migrateHelm = task({
  name: 'migrate-helm',
  purpose: 'Migrate Helm chart configuration to Forge conventions',
  requirements: [
    require('agent.skill', { name: 'forge-migration' }),
    require('agent.skill', { name: 'helm' }),
  ],
  instructions: [
    'Read existing Chart.yaml and values.yaml files',
    'Update chart metadata to follow Forge naming conventions',
    'Ensure values.yaml uses Forge-managed image registry references',
    'Update any helmfile.yaml if present',
  ],
  rules: [
    'Chart.yaml must follow Forge naming conventions',
  ],
  inputs: {
    platform: string('Platform: devcloud or codeak'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/charts/**', '/repo/Chart.yaml', '/repo/values.yaml', '/repo/helmfile.yaml'] },
    tools: ['node', 'pnpm', 'helm'],
  },
  gates: [successfulBuild()],
});
