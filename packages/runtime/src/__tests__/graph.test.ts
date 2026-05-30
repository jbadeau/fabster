import { describe, expect, it } from 'vitest';
import { command, run, string, boolean, workspace, workflow, successfulBuild } from '@fabster/core';
import { extractNodes } from '../engine/graph.js';

const testCommand = command({
  name: 'test-cmd',
  purpose: 'Test command',
  steps: [run('echo {name}')],
  inputs: { name: string(), flag: boolean() },
  gates: [successfulBuild()],
});

describe('extractNodes', () => {
  it('extracts nodes from a workflow graph', () => {
    const wf = workflow({
      name: 'test-wf',
      purpose: 'Test workflow',
      workspace: workspace('/tmp/test-repo'),
      graph: (ctx) => {
        const n1 = ctx.run('step-1', testCommand, { name: 'a', flag: true });
        ctx.run('step-2', testCommand, { name: 'b', flag: false }, { dependsOn: [n1] });
      },
    });

    const nodes = extractNodes(wf);

    expect(nodes).toHaveLength(2);
    expect(nodes[0].id).toBe('step-1');
    expect(nodes[0].inputs).toEqual({ name: 'a', flag: true });
    expect(nodes[0].dependsOn).toEqual([]);
    expect(nodes[1].id).toBe('step-2');
    expect(nodes[1].dependsOn).toEqual(['step-1']);
  });

  it('throws on duplicate node ids', () => {
    const wf = workflow({
      name: 'dup-wf',
      purpose: 'Dup test',
      workspace: workspace('/tmp/test-repo'),
      graph: (ctx) => {
        ctx.run('same-id', testCommand, { name: 'a', flag: true });
        ctx.run('same-id', testCommand, { name: 'b', flag: false });
      },
    });

    expect(() => extractNodes(wf)).toThrow('Duplicate node id: "same-id"');
  });

  it('throws on unknown dependency', () => {
    const wf = workflow({
      name: 'bad-dep-wf',
      purpose: 'Bad dep test',
      workspace: workspace('/tmp/test-repo'),
      graph: (ctx) => {
        ctx.run('step-1', testCommand, { name: 'a', flag: true }, {
          dependsOn: [{ id: 'nonexistent' }],
        });
      },
    });

    expect(() => extractNodes(wf)).toThrow('depends on unknown node "nonexistent"');
  });
});
