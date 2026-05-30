import { task, require, string, successfulBuild } from '@fabster/core';

export const migrateDocker = task({
  name: 'migrate-docker',
  purpose: 'Migrate Docker and Jib configuration to Forge conventions',
  requirements: [
    require('agent.skill', { name: 'forge-migration' }),
    require('agent.skill', { name: 'docker' }),
  ],
  instructions: [
    'Read existing Dockerfile and/or jib.yaml files',
    'Update Jib labels to use forge-* prefixed labels for registry auth',
    'Replace hardcoded registry URLs with Forge-managed variables',
    'Update base image references if they use deprecated registries',
    'Ensure Docker build context follows Forge conventions',
  ],
  rules: [
    'No hardcoded registry URLs in Dockerfile or jib.yaml',
    'Jib labels must use forge-* prefix for authentication',
  ],
  inputs: {
    platform: string('Platform: devcloud or codeak'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/Dockerfile', '/repo/**/Dockerfile', '/repo/jib.yaml', '/repo/**/jib.yaml'] },
    tools: ['node', 'pnpm'],
  },
  gates: [successfulBuild()],
});
