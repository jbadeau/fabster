import { describe, expect, it } from 'vitest';
import { workspace } from '../builders/workspace.js';

describe('workspace', () => {
  it('creates a workspace with a root path', () => {
    const ws = workspace('/repo');

    expect(ws.root).toBe('/repo');
  });
});
