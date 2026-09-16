import { describe, expect, it } from 'vitest';
import {
  formatted,
  gate,
  linted,
  successfulBuild,
  testsPass,
} from '../builders/gate.js';

describe('gates', () => {
  it('rejects a custom gate without a check script', () => {
    expect(() => gate('securityScan', { description: 'Run security scan' })).toThrow(
      /must declare a check script/,
    );
  });

  it('creates a custom gate with a check script', () => {
    const g = gate('openapi-lint', { check: 'npx redocly lint {specPath}' });
    expect(g.check).toBe('npx redocly lint {specPath}');
  });

  it('creates built-in gates', () => {
    expect(successfulBuild()).toEqual({ kind: 'successfulBuild' });
    expect(formatted()).toEqual({ kind: 'formatted' });
    expect(linted()).toEqual({ kind: 'linted' });
    expect(testsPass()).toEqual({ kind: 'testsPass' });
  });
});
