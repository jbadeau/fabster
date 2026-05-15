import {
  task,
  string,
  require,
  successfulBuild,
  testsPass,
  linted,
} from '@fabster/core';

export const implementComponent = task({
  name: 'implement-component',
  purpose: 'Implement a UI component with tests and exports',
  reasoning: 'medium',
  requirements: [
    require('agent.skill', { name: 'code-generation', language: 'typescript' }),
    require('agent.skill', { name: 'react' }),
  ],
  inputs: {
    project: string('Nx project containing the component'),
    component: string('Component name'),
    description: string('What the component should do'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm', 'npx'],
  },
  gates: [successfulBuild(), testsPass(), linted()],
});
