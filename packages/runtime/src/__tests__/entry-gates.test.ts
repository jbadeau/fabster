import { describe, expect, it } from 'vitest';
import { checkEntryGates } from '../gates/entry-gates.js';

describe('checkEntryGates', () => {
  it('passes when all declared inputs are present with matching types', () => {
    const results = checkEntryGates(
      {
        name: { kind: 'string' },
        count: { kind: 'number' },
        dryRun: { kind: 'boolean' },
        outDir: { kind: 'dir' },
      },
      { name: 'x', count: 3, dryRun: false, outDir: '/tmp/out' },
    );

    expect(results).toHaveLength(4);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it('fails when a required input is missing', () => {
    const results = checkEntryGates({ name: { kind: 'string' } }, {});

    expect(results[0].passed).toBe(false);
    expect(results[0].detail).toContain('missing required input');
  });

  it('passes when an optional input is missing', () => {
    const results = checkEntryGates(
      { name: { kind: 'string', required: false } },
      {},
    );

    expect(results[0].passed).toBe(true);
  });

  it('fails when a value has the wrong type', () => {
    const results = checkEntryGates(
      { count: { kind: 'number' } },
      { count: 'three' },
    );

    expect(results[0].passed).toBe(false);
    expect(results[0].detail).toContain('expected number, got string');
  });

  it('returns no results for an empty or missing schema', () => {
    expect(checkEntryGates(undefined, { extra: 1 })).toHaveLength(0);
    expect(checkEntryGates({}, {})).toHaveLength(0);
  });
});
