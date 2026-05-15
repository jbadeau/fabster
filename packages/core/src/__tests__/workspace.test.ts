import { describe, expect, it } from 'vitest';
import { RAMResource } from '@struktoai/mirage-core';
import { workspace } from '../builders/workspace.js';

describe('workspace', () => {
  it('creates a workspace with a mirage resource mount', () => {
    const ram = new RAMResource();
    const ws = workspace({
      '/repo': ram,
    });

    expect(ws.mounts['/repo']).toBe(ram);
    expect(ws.mounts['/repo'].kind).toBe('ram');
  });

  it('creates a workspace with multiple mounts', () => {
    const ws = workspace({
      '/repo': new RAMResource(),
      '/tmp': new RAMResource(),
    });

    expect(Object.keys(ws.mounts)).toEqual(['/repo', '/tmp']);
  });
});
