import { describe, expect, it } from 'vitest';
import { task } from '../builders/task.js';
import { string } from '../builders/io.js';
import { require_ } from '../builders/capability.js';
import { linted, successfulBuild, testsPass } from '../builders/gate.js';

describe('task', () => {
  it('creates a task definition', () => {
    const t = task({
      name: 'implement-component',
      purpose: 'Implement a React component with tests',
      requirements: [
        require_('agent.skill', {
          name: 'code-generation',
          language: 'typescript',
        }),
        require_('agent.skill', { name: 'testing' }),
      ],
      inputs: {
        componentName: string(),
        library: string(),
      },
      permissions: {
        fs: { read: ['/repo/**'], write: ['/repo/packages/**'] },
        tools: ['nx@22', 'git'],
      },
      post: [successfulBuild(), testsPass(), linted()],
    });

    expect(t.kind).toBe('task');
    expect(t.name).toBe('implement-component');
    expect(t.requirements).toHaveLength(2);
    expect(t.requirements[0].namespace).toBe('agent.skill');
    expect(t.inputs.componentName.kind).toBe('string');
    expect(t.post).toHaveLength(3);
  });

  it('rejects a task with no post-gates', () => {
    expect(() =>
      task({
        name: 'unverified',
        purpose: 'A task without any post-gate',
        requirements: [],
        inputs: {},
        post: [],
      }),
    ).toThrow(/at least one post-gate/);
  });

  it('rejects a task that omits post-gates entirely', () => {
    expect(() =>
      task({
        name: 'unverified',
        purpose: 'A task without any post-gate',
        requirements: [],
        inputs: {},
      }),
    ).toThrow(/at least one post-gate/);
  });
});
