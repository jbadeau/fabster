import { describe, expect, it } from 'vitest';
import {
  workspace,
  sandboxProfile,
  task,
  command,
  run,
  workflow,
  string,
  boolean,
  require,
  provide,
  externalAgent,
  successfulBuild,
  formatted,
  linted,
  mergeRequest,
  testsPass,
} from '../index.js';

describe('integration', () => {
  it('composes a full workflow from catalog items', () => {
    // Sandbox profiles
    const nodeBuild = sandboxProfile('node-build', {
      image: 'node-20',
      network: 'restricted',
      readonlyRoot: true,
    });
    expect(nodeBuild.config.backend).toBe('bubblewrap');

    // Agents
    const forgeAgent = externalAgent('forge-generator-implementer', {
      role: 'Forge generator implementer',
      goal: 'Implements Forge generators for any language',
      backstory: 'You are a code generation agent for Nx monorepos.',
      capabilities: [
        provide('agent.skill', {
          name: 'code-generation',
          language: 'typescript',
        }),
        provide('agent.skill', {
          name: 'testing',
          language: 'typescript',
        }),
        provide('agent.skill', { name: 'refactoring' }),
      ],
      adapter: { kind: 'command', command: 'claude', args: ['-p', '{prompt}'] },
    });
    expect(forgeAgent.kind).toBe('external-agent');
    expect(forgeAgent.adapter.command).toBe('claude');

    // Commands
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
        fs: {
          read: ['/repo/**'],
          write: ['/repo/packages/**'],
        },
        tools: ['nx@22', 'pnpm@10', 'git'],
      },
      post: [successfulBuild(), formatted(), linted()],
    });
    expect(createReactLibrary.kind).toBe('command');

    // Tasks
    const implementComponent = task({
      name: 'implement-component',
      purpose: 'Implement a React component with tests',
      requirements: [
        require('agent.skill', {
          name: 'code-generation',
          language: 'typescript',
        }),
        require('agent.skill', { name: 'testing' }),
      ],
      inputs: {
        componentName: string(),
        library: string(),
      },
      permissions: {
        fs: { read: ['/repo/**'], write: ['/repo/packages/**'] },
        tools: ['nx@22', 'git'],
      },
      post: [successfulBuild(), testsPass()],
    });
    expect(implementComponent.kind).toBe('task');

    // Workflow
    const createDesignSystem = workflow({
      name: 'create-design-system',
      purpose: 'Create a full design system with tokens and components',
      workspace: workspace('/repo'),
      delivery: mergeRequest(),
      graph: (ctx) => {
        const scaffoldTokens = ctx.run('scaffold-tokens', createReactLibrary, {
          name: 'tokens',
          scope: 'design-system',
          publishable: true,
        });

        const scaffoldComponents = ctx.run(
          'scaffold-components',
          createReactLibrary,
          {
            name: 'components',
            scope: 'design-system',
            publishable: true,
          },
          { dependsOn: [scaffoldTokens] },
        );

        const implTokens = ctx.run(
          'impl-tokens',
          implementComponent,
          {
            componentName: 'color-tokens',
            library: 'design-system-tokens',
          },
          { dependsOn: [scaffoldComponents] },
        );

        ctx.run(
          'impl-button',
          implementComponent,
          {
            componentName: 'button',
            library: 'design-system-components',
          },
          { dependsOn: [implTokens] },
        );
      },
    });

    expect(createDesignSystem.kind).toBe('workflow');
    expect(createDesignSystem.name).toBe('create-design-system');
    expect(createDesignSystem.workspace.root).toBe('/repo');
  });
});
