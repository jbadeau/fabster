import { describe, expect, it } from 'vitest';
import { sandboxProfile } from '../builders/sandbox.js';

describe('sandboxProfile', () => {
  it('defaults to bubblewrap backend', () => {
    const profile = sandboxProfile('default');
    expect(profile.name).toBe('default');
    expect(profile.config.backend).toBe('bubblewrap');
  });

  it('creates a profile with custom config', () => {
    const profile = sandboxProfile('node-build', {
      image: 'node-20',
      network: 'restricted',
      readonlyRoot: true,
    });

    expect(profile).toEqual({
      name: 'node-build',
      config: {
        backend: 'bubblewrap',
        image: 'node-20',
        network: 'restricted',
        readonlyRoot: true,
      },
    });
  });

  it('allows overriding backend', () => {
    const profile = sandboxProfile('remote', {
      backend: 'firecracker',
      image: 'node-20',
    });

    expect(profile.config.backend).toBe('firecracker');
  });
});
