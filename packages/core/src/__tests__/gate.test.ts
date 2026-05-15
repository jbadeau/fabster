import { describe, expect, it } from 'vitest';
import {
  conformant,
  formatted,
  gate,
  humanApproved,
  linted,
  successfulBuild,
  testsPass,
} from '../builders/gate.js';

describe('gates', () => {
  it('creates a custom gate', () => {
    const g = gate('securityScan', { description: 'Run security scan' });
    expect(g).toEqual({
      kind: 'securityScan',
      description: 'Run security scan',
    });
  });

  it('creates built-in gates', () => {
    expect(successfulBuild()).toEqual({ kind: 'successfulBuild' });
    expect(formatted()).toEqual({ kind: 'formatted' });
    expect(linted()).toEqual({ kind: 'linted' });
    expect(conformant()).toEqual({ kind: 'conformant' });
    expect(humanApproved()).toEqual({ kind: 'humanApproved' });
    expect(testsPass()).toEqual({ kind: 'testsPass' });
  });
});
