import { describe, expect, it } from 'vitest';
import { task } from '../builders/task.js';
import { string } from '../builders/io.js';
import { require_ } from '../builders/capability.js';
import { humanApproved, successfulBuild, testsPass } from '../builders/gate.js';

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
      gates: [successfulBuild(), testsPass(), humanApproved()],
    });

    expect(t.kind).toBe('task');
    expect(t.name).toBe('implement-component');
    expect(t.requirements).toHaveLength(2);
    expect(t.requirements[0].namespace).toBe('agent.skill');
    expect(t.inputs.componentName.kind).toBe('string');
    expect(t.gates).toHaveLength(3);
  });
});
