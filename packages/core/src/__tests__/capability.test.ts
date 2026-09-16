import { describe, expect, it } from 'vitest';
import { provide, require_ } from '../builders/capability.js';

describe('capability', () => {
  it('creates a requirement', () => {
    const req = require_('agent.skill', {
      name: 'code-generation',
      language: 'typescript',
    });

    expect(req).toEqual({
      namespace: 'agent.skill',
      filter: { name: 'code-generation', language: 'typescript' },
    });
  });

  it('creates an optional requirement', () => {
    const req = require_('agent.skill', { name: 'refactoring' }, { optional: true });

    expect(req).toEqual({
      namespace: 'agent.skill',
      filter: { name: 'refactoring' },
      optional: true,
    });
  });

  it('creates a capability', () => {
    const cap = provide('agent.skill', {
      name: 'code-generation',
      language: 'typescript',
    });

    expect(cap).toEqual({
      namespace: 'agent.skill',
      attributes: { name: 'code-generation', language: 'typescript' },
    });
  });
});
