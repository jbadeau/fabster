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
      state: 'complete',
      branch: 'fabster/create-ds/scaffold-tokens',
      mr: '#142',
      duration: 4000,
      validationGates: [
        { kind: 'successfulBuild', passed: true },
        { kind: 'linted', passed: true },
      ],
      reviewGates: [],
      logs: ['> nx generate ...', 'Build successful'],
      inputs: { name: 'tokens', scope: 'design-system' },
      errors: [],
    },
    {
      id: 'impl-tokens',
      name: 'implement-component',
      type: 'task',
      state: 'executing',
      reasoning: 'medium',
      agent: 'forge-generator',
      branch: 'fabster/create-ds/impl-tokens',
      duration: 47000,
      validationGates: [],
      reviewGates: [],
      logs: ['[think] Creating color tokens...'],
      inputs: { componentName: 'color-tokens' },
      errors: [],
    },
    {
      id: 'impl-button',
      name: 'implement-component',
      type: 'task',
      state: 'pending',
      branch: '',
      duration: 0,
      validationGates: [],
      reviewGates: [],
      logs: [],
      inputs: {},
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
    state: 'complete' as const,
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
      state: 'failed' as const,
      validationGates: [
        { kind: 'successfulBuild', passed: true },
        { kind: 'linted', passed: false },
      ],
      errors: ['ERROR: 3 lint violations'],
    },
    { ...mockRunningWorkflow.nodes[2], state: 'skipped' as const, logs: ['Skipped'] },
  ],
};

describe('App', () => {
  it('renders running workflow with node list', () => {
    const { lastFrame } = render(<App workflow={mockRunningWorkflow} />);
    const output = lastFrame();

    expect(output).toContain('fabster');
    expect(output).toContain('create-design-system');
    expect(output).toContain('scaffold-toke');
    expect(output).toContain('impl-tokens');
    expect(output).toContain('impl-button');
    expect(output).toContain('1');
    expect(output).toContain('/');
    expect(output).toContain('3');
  });

  it('renders completed workflow', () => {
    const { lastFrame } = render(<App workflow={mockCompletedWorkflow} />);
    const output = lastFrame();

    expect(output).toContain('complete');
    expect(output).toContain('stacked MRs');
    expect(output).toContain('merge');
  });

  it('renders failed workflow', () => {
    const { lastFrame } = render(<App workflow={mockFailedWorkflow} />);
    const output = lastFrame();

    expect(output).toContain('failed');
  });
});
