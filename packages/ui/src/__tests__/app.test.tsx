import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from '../components/app.js';
import type { WorkflowInfo } from '../types.js';

const mockRunningWorkflow: WorkflowInfo = {
  name: 'create-design-system',
  status: 'running',
  elapsed: 54000,
  nodes: [
    {
      id: 'scaffold-tokens',
      name: 'create-react-library',
      type: 'command',
      status: 'success',
      branch: 'fabster/create-ds/scaffold-tokens',
      mr: '#142',
      duration: 4000,
      gates: [
        { kind: 'successfulBuild', passed: true },
        { kind: 'linted', passed: true },
        { kind: 'formatted', passed: true },
      ],
      logs: [
        '> nx generate @forge/react:library --name=tokens --scope=design-system',
        'CREATE packages/design-system/tokens/package.json',
        'CREATE packages/design-system/tokens/src/index.ts',
        '> pnpm format',
        '> nx build design-system-tokens',
        'Build successful',
      ],
      inputs: { name: 'tokens', scope: 'design-system', publishable: true },
      errors: [],
    },
    {
      id: 'scaffold-comps',
      name: 'create-react-library',
      type: 'command',
      status: 'success',
      branch: 'fabster/create-ds/scaffold-comps',
      mr: '#143',
      duration: 3000,
      gates: [
        { kind: 'successfulBuild', passed: true },
        { kind: 'linted', passed: true },
      ],
      logs: [
        '> nx generate @forge/react:library --name=components --scope=design-system',
        'CREATE packages/design-system/components/package.json',
        'Build successful',
      ],
      inputs: { name: 'components', scope: 'design-system', publishable: true },
      errors: [],
    },
    {
      id: 'impl-tokens',
      name: 'implement-component',
      type: 'task',
      status: 'running',
      reasoning: 'medium',
      agent: 'forge-generator',
      branch: 'fabster/create-ds/impl-tokens',
      duration: 47000,
      gates: [],
      logs: [
        '[think] I need to create color tokens. Let me check what exists first...',
        '[tool] readFile',
        '  path: /packages/design-system/tokens/src/',
        '[result] Directory exists but src/ is empty',
        '[think] Empty directory. I\'ll create the base color palette...',
        '[tool] writeFile',
        '  path: src/colors.ts',
        '[result] Written 42 lines',
      ],
      inputs: { componentName: 'color-tokens', library: 'design-system-tokens' },
      errors: [],
    },
    {
      id: 'impl-button',
      name: 'implement-component',
      type: 'task',
      status: 'pending',
      reasoning: 'medium',
      branch: '',
      duration: 0,
      gates: [],
      logs: [],
      inputs: { componentName: 'button', library: 'design-system-components' },
      errors: [],
    },
  ],
};

const mockCompletedWorkflow: WorkflowInfo = {
  name: 'create-design-system',
  status: 'success',
  elapsed: 195000,
  nodes: mockRunningWorkflow.nodes.map((n) => ({
    ...n,
    status: 'success' as const,
    mr: n.mr ?? '#145',
    duration: n.duration || 105000,
  })),
};

const mockFailedWorkflow: WorkflowInfo = {
  name: 'create-design-system',
  status: 'failed',
  elapsed: 7000,
  nodes: [
    mockRunningWorkflow.nodes[0],
    {
      ...mockRunningWorkflow.nodes[1],
      status: 'failed',
      gates: [
        { kind: 'successfulBuild', passed: true },
        { kind: 'linted', passed: false },
      ],
      errors: [
        'ERROR: 3 lint violations',
        'src/index.ts:5 missing-export',
        'src/index.ts:12 no-unused-vars',
        'src/lib.ts:24 prefer-const',
      ],
    },
    { ...mockRunningWorkflow.nodes[2], status: 'skipped', logs: ['Skipped'] },
    { ...mockRunningWorkflow.nodes[3], status: 'skipped', logs: ['Skipped'] },
  ],
};

describe('App', () => {
  it('renders running workflow with node list', () => {
    const { lastFrame } = render(<App workflow={mockRunningWorkflow} />);
    const output = lastFrame();

    expect(output).toContain('fabster');
    expect(output).toContain('create-design-system');
    expect(output).toContain('scaffold-toke');  // truncated in narrow column
    expect(output).toContain('impl-tokens');
    expect(output).toContain('impl-button');
    expect(output).toContain('2/4 complete');
  });

  it('renders completed workflow', () => {
    const { lastFrame } = render(<App workflow={mockCompletedWorkflow} />);
    const output = lastFrame();

    expect(output).toContain('complete');
    expect(output).toContain('stacked MRs');
    expect(output).toContain('merge all');
  });

  it('renders failed workflow', () => {
    const { lastFrame } = render(<App workflow={mockFailedWorkflow} />);
    const output = lastFrame();

    expect(output).toContain('failed');
    expect(output).toContain('scaffold-comp');  // truncated in narrow column
  });
});
