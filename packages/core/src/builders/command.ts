import type { CommandDefinition, Step, RunStep } from '../types/command.js';
import type { Gate } from '../types/gate.js';
import type { IOSchema } from '../types/io.js';
import type { Permissions } from '../types/common.js';

export function run(script: string): RunStep {
  return Object.freeze({ _tag: 'run' as const, script });
}

interface CommandConfig<I extends IOSchema, O extends IOSchema> {
  readonly name: string;
  readonly purpose: string;
  readonly steps: readonly Step[];
  readonly inputs: I;
  readonly outputs?: O;
  readonly permissions?: Permissions;
  readonly sandbox?: string;
  readonly gates?: readonly Gate[];
}

export function command<I extends IOSchema, O extends IOSchema = IOSchema>(
  config: CommandConfig<I, O>,
): CommandDefinition<I, O> {
  return Object.freeze({
    kind: 'command' as const,
    ...config,
  });
}
