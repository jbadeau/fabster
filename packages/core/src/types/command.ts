import type { Gate } from './gate.js';
import type { IOSchema } from './io.js';
import type { Permissions } from './common.js';

export interface RunStep {
  readonly _tag: 'run';
  readonly script: string;
}

export type Step = RunStep;

export interface CommandDefinition<I extends IOSchema = IOSchema, O extends IOSchema = IOSchema> {
  readonly kind: 'command';
  readonly name: string;
  readonly purpose: string;
  readonly steps: readonly Step[];
  readonly inputs: I;
  readonly outputs?: O;
  readonly permissions?: Permissions;
  readonly sandbox?: string;
  readonly gates?: readonly Gate[];
}
