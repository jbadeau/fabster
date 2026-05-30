import { task, require, string, successfulBuild } from '@fabster/core';

export const migrateMaven = task({
  name: 'migrate-maven',
  purpose: 'Migrate Maven configuration to Forge conventions',
  requirements: [
    require('agent.skill', { name: 'forge-migration' }),
    require('agent.skill', { name: 'maven' }),
  ],
  instructions: [
    'Read existing pom.xml files and .mvn/settings.xml',
    'Replace hardcoded repository URLs with ${env.CODEAK_MAVEN_PUBLIC_REPO}',
    'Replace hardcoded credentials with ${env.CODEAK_REPOSITORY_USERNAME} and ${env.CODEAK_REPOSITORY_PASSWORD}',
    'Update parent POM references to Forge conventions if applicable',
    'Prefix environment variables with FORGE_ where required by Forge',
    'Preserve custom build profiles that are not Forge-managed',
    'Write updated .mvn/maven.config with Forge options',
    'Run mvn validate or pnpm build to verify changes',
  ],
  rules: [
    'settings.xml must not contain plaintext passwords',
    'pom.xml must not contain hardcoded repository URLs',
    'All repository credentials must reference environment variables',
  ],
  inputs: {
    platform: string('Platform: devcloud or codeak'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/pom.xml', '/repo/**/pom.xml', '/repo/.mvn/**'] },
    tools: ['node', 'pnpm', 'mvn'],
  },
  gates: [successfulBuild()],
});
