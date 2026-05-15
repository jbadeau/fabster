import {
  task,
  string,
  require,
  successfulBuild,
  testsPass,
  linted,
  humanApproved,
} from '@fabster/core';

export const implementFeature = task({
  name: 'implement-feature',
  purpose: 'Implement a feature in an existing Nx project with tests',
  reasoning: 'high',
  requirements: [
    require('agent.skill', { name: 'code-generation', language: 'typescript' }),
    require('agent.skill', { name: 'testing' }),
  ],
  inputs: {
    project: string('Nx project name'),
    feature: string('Description of the feature to implement'),
    details: string('Detailed requirements and acceptance criteria'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm'],
  },
  gates: [successfulBuild(), testsPass(), linted(), humanApproved()],
});
