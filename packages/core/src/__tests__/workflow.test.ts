import { describe, expect, it } from 'vitest';
import { workflow } from '../builders/workflow.js';
import { workspace } from '../builders/workspace.js';
import { command, run } from '../builders/command.js';
import { string, boolean } from '../builders/io.js';
import { successfulBuild, linted } from '../builders/gate.js';

const createReactLibrary = command({
  name: 'create-react-library',
  purpose: 'Create a React library in the monorepo',
  steps: [run('nx generate @forge/react:library --name={name} --scope={scope}')],
  inputs: {
    name: string(),
    scope: string(),
    publishable: boolean(),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/packages/**'] },
    tools: ['nx@22', 'pnpm@10', 'git'],
  },
  gates: [successfulBuild(), linted()],
});

describe('workflow', () => {
  it('creates a workflow definition', () => {
    const wf = workflow({
      name: 'create-design-system',
      purpose: 'Create a full design system',
      workspace: workspace('/repo'),
      graph: (ctx) => {
        const scaffoldTokens = ctx.run('scaffold-tokens', createReactLibrary, {
          name: 'tokens',
          scope: 'design-system',
          publishable: true,
        });

        ctx.run(
          'scaffold-components',
          createReactLibrary,
          {
            name: 'components',
            scope: 'design-system',
            publishable: true,
          },
          { dependsOn: [scaffoldTokens] },
        );
      },
    });

    expect(wf.kind).toBe('workflow');
    expect(wf.name).toBe('create-design-system');
    expect(wf.workspace.root).toBe('/repo');
  });

  it('graph function produces node handles', () => {
    const nodeIds: string[] = [];

    workflow({
      name: 'test-workflow',
      purpose: 'Test node handles',
      workspace: workspace('/repo'),
      graph: (ctx) => {
        const n1 = ctx.run('step-1', createReactLibrary, {
          name: 'a',
          scope: 'b',
          publishable: false,
        });
        nodeIds.push(n1.id);

        const n2 = ctx.run(
          'step-2',
          createReactLibrary,
          { name: 'c', scope: 'd', publishable: false },
          { dependsOn: [n1] },
        );
        nodeIds.push(n2.id);
      },
    });

    expect(nodeIds).toEqual(['step-1', 'step-2']);
  });
});
