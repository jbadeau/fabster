import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import { NodeList } from '../components/node-list.js';
import type { NodeInfo } from '../types.js';

const mockNodes: NodeInfo[] = [
  {
    id: 'step-1', name: 'cmd-a', type: 'command', state: 'complete',
    branch: '', duration: 1000, validationGates: [], reviewGates: [], logs: [], inputs: {}, errors: [],
  },
  {
    id: 'step-2', name: 'cmd-b', type: 'task', state: 'executing',
    branch: '', duration: 500, validationGates: [], reviewGates: [], logs: [], inputs: {}, errors: [],
  },
  {
    id: 'step-3', name: 'cmd-c', type: 'command', state: 'pending',
    branch: '', duration: 0, validationGates: [], reviewGates: [], logs: [], inputs: {}, errors: [],
  },
];

describe('NodeList', () => {
  it('renders all nodes', () => {
    const { lastFrame } = render(<NodeList nodes={mockNodes} selectedIndex={0} />);
    const output = lastFrame();

    expect(output).toContain('step-1');
    expect(output).toContain('step-2');
    expect(output).toContain('step-3');
  });

  it('highlights the selected node', () => {
    const { lastFrame } = render(<NodeList nodes={mockNodes} selectedIndex={1} />);
    const output = lastFrame();

    expect(output).toContain('>');
    expect(output).toContain('step-2');
  });

  it('shows pipe connectors between nodes', () => {
    const { lastFrame } = render(<NodeList nodes={mockNodes} selectedIndex={0} />);
    const output = lastFrame();

    expect(output).toContain('|');
  });
});
