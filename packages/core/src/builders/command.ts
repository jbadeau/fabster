import type { CommandDefinition, Step, RunStep, JsonMergeStep, UseStep } from '../types/command.js';
import type { Gate } from '../types/gate.js';
import type { IOSchema } from '../types/io.js';
import type { Permissions } from '../types/common.js';

export function run(script: string): RunStep {
  return Object.freeze({ _tag: 'run' as const, script });
}

export function jsonMerge(path: string, patch: Record<string, unknown>): JsonMergeStep {
  return Object.freeze({ _tag: 'jsonMerge' as const, path, patch: Object.freeze(patch) });
}

export function use(
  command: CommandDefinition,
  inputs: Record<string, string | number | boolean>,
): UseStep {
  return Object.freeze({ _tag: 'use' as const, command, inputs: Object.freeze({ ...inputs }) });
}

interface CommandConfig<I extends IOSchema, O extends IOSchema> {
  readonly name: string;
  readonly purpose: string;
  readonly steps: readonly Step[];
  readonly inputs: I;
  readonly outputs?: O;
  readonly permissions?: Permissions;
  readonly sandbox?: string;
  readonly pre?: readonly Gate[];
  readonly post?: readonly Gate[];
}

export function command<I extends IOSchema, O extends IOSchema = IOSchema>(
  config: CommandConfig<I, O>,
): CommandDefinition<I, O> {
  return Object.freeze({
    kind: 'command' as const,
    ...config,
  });
}
