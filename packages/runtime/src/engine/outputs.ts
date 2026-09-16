import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { CommandDefinition, IODescriptor, TaskDefinition } from '@fabster/core';
import type { GateResult } from '../types.js';

export const OUTPUTS_FILE = '.fabster/outputs.json';

const KIND_TO_TYPEOF: Record<string, 'string' | 'number' | 'boolean'> = {
  string: 'string',
  dir: 'string',
  file: 'string',
  number: 'number',
  boolean: 'boolean',
};

export interface NodeOutputsResult {
  readonly outputs: Record<string, string | number | boolean>;
  readonly gates: GateResult[];
}

/**
 * Collect a node's outputs from .fabster/outputs.json in the worktree —
 * the only source of output values. Every declared output is verified
 * present and typed, recorded as gate results.
 */
export async function readNodeOutputs(
  def: TaskDefinition | CommandDefinition,
  worktreeCwd: string,
): Promise<NodeOutputsResult> {
  const schema = def.outputs;
  const gates: GateResult[] = [];

  let fileOutputs: Record<string, unknown> = {};
  try {
    const raw = await readFile(path.join(worktreeCwd, OUTPUTS_FILE), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      fileOutputs = parsed as Record<string, unknown>;
    } else {
      gates.push({
        gate: { kind: 'validOutput', description: OUTPUTS_FILE },
        passed: false,
        detail: `${OUTPUTS_FILE} must contain a JSON object`,
      });
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      gates.push({
        gate: { kind: 'validOutput', description: OUTPUTS_FILE },
        passed: false,
        detail: `${OUTPUTS_FILE} is not valid JSON: ${error.message}`,
      });
    }
    // ENOENT: no file written — every required declared output fails below
  }

  if (!schema || Object.keys(schema).length === 0) {
    return { outputs: {}, gates };
  }

  const outputs: Record<string, string | number | boolean> = {};
  for (const [name, descriptor] of Object.entries(schema)) {
    const value = fileOutputs[name];
    gates.push(checkOutput(name, descriptor, value));
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      outputs[name] = value;
    }
  }

  return { outputs, gates };
}

function checkOutput(
  name: string,
  descriptor: IODescriptor,
  value: unknown,
): GateResult {
  const gate = { kind: 'validOutput', description: name };

  if (value === undefined) {
    const required = descriptor.required !== false;
    return {
      gate,
      passed: !required,
      detail: required
        ? `${name}: missing from ${OUTPUTS_FILE}`
        : `${name}: optional, not produced`,
    };
  }

  const expected = KIND_TO_TYPEOF[descriptor.kind] ?? 'string';
  const actual = typeof value;
  return actual === expected
    ? { gate, passed: true, detail: `${name}: ok` }
    : { gate, passed: false, detail: `${name}: expected ${descriptor.kind}, got ${actual}` };
}
