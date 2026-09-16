import type { Requirement } from './capability.js';
import type { Gate } from './gate.js';
import type { IOSchema } from './io.js';
import type { Permissions } from './common.js';

export type ReasoningLevel = 'low' | 'medium' | 'high';

export interface TaskDefinition<I extends IOSchema = IOSchema, O extends IOSchema = IOSchema> {
  readonly kind: 'task';
  readonly name: string;
  readonly purpose: string;
  readonly reasoning?: ReasoningLevel;
  readonly requirements: readonly Requirement[];
  readonly instructions?: readonly string[];
  readonly rules?: readonly string[];
  readonly inputs: I;
  readonly outputs?: O;
  readonly permissions?: Permissions;
  readonly sandbox?: string;
  /** Deterministic checks run in the worktree before the effect. */
  readonly pre?: readonly Gate[];
  /** Deterministic checks that decide node success. Never empty. */
  readonly post: readonly Gate[];
  /** Retry budget on post-gate failure. Tasks only; defaults to 0. */
  readonly retries?: number;
}
