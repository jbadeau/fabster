import { command, run } from '@fabster/core';

export const cleanupLegacy = command({
  name: 'cleanup-legacy',
  purpose: 'Remove legacy files that conflict with Forge (Maven wrappers, .env files, old configs)',
  steps: [
    run('rm -rf mvnw mvnw.cmd .mvn/wrapper'),
    run('find . -name ".env" -not -path "./node_modules/*" -delete 2>/dev/null || true'),
    run('rm -f .scotty.yml nexus_rel.json 2>/dev/null || true'),
  ],
  inputs: {},
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node'],
  },
  gates: [],
});
