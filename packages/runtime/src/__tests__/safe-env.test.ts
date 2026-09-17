import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { safeEnv } from '../engine/safe-env.js';

describe('safeEnv', () => {
  const SENTINEL = 'ANTHROPIC_API_KEY';
  let original: string | undefined;

  beforeEach(() => {
    original = process.env[SENTINEL];
    process.env[SENTINEL] = 'sk-should-not-leak';
    process.env['PATH'] = process.env['PATH'] ?? '/usr/bin';
  });

  afterEach(() => {
    if (original === undefined) delete process.env[SENTINEL];
    else process.env[SENTINEL] = original;
  });

  it('excludes everything not on the allowlist', () => {
    const env = safeEnv();

    expect(env[SENTINEL]).toBeUndefined();
  });

  it('keeps the baseline a process needs to actually run', () => {
    const env = safeEnv();

    expect(env['PATH']).toBe(process.env['PATH']);
  });

  it('lets explicit overrides through, even for names off the allowlist', () => {
    const env = safeEnv({ [SENTINEL]: 'sk-explicitly-declared' });

    expect(env[SENTINEL]).toBe('sk-explicitly-declared');
  });
});
