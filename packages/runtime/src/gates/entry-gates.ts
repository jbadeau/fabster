import type { IODescriptor, IOSchema } from '@fabster/core';
import type { GateResult } from '../types.js';

const KIND_TO_TYPEOF: Record<string, 'string' | 'number' | 'boolean'> = {
  string: 'string',
  dir: 'string',
  file: 'string',
  number: 'number',
  boolean: 'boolean',
};

/**
 * Deterministic entry verification: every declared input must be present
 * (unless optional) and match its declared kind before the effect runs.
 */
export function checkEntryGates(
  schema: IOSchema | undefined,
  values: Record<string, string | number | boolean>,
): GateResult[] {
  return Object.entries(schema ?? {}).map(([name, descriptor]) =>
    checkInput(name, descriptor, values),
  );
}

function checkInput(
  name: string,
  descriptor: IODescriptor,
  values: Record<string, string | number | boolean>,
): GateResult {
  const gate = { kind: 'validInput', description: name };

  if (!(name in values)) {
    const required = descriptor.required !== false;
    return {
      gate,
      passed: !required,
      detail: required
        ? `${name}: missing required input`
        : `${name}: optional, not provided`,
    };
  }

  const expected = KIND_TO_TYPEOF[descriptor.kind] ?? 'string';
  const actual = typeof values[name];
  return actual === expected
    ? { gate, passed: true, detail: `${name}: ok` }
    : { gate, passed: false, detail: `${name}: expected ${descriptor.kind}, got ${actual}` };
}
