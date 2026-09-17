import type { Gate } from './gate.js';
import type { IOSchema } from './io.js';
import type { Permissions } from './common.js';

export interface RunStep {
  readonly _tag: 'run';
  readonly script: string;
}

/**
 * Deep-merge a JSON object into a file in the worktree — declarative,
 * in-process, and loggable as a diff, for the common case of patching
 * generated config (tsconfig, package.json) without shelling out to a
 * script that has to be trusted to run inside the node's own sandbox.
 */
export interface JsonMergeStep {
  readonly _tag: 'jsonMerge';
  readonly path: string;
  readonly patch: Readonly<Record<string, unknown>>;
}

/**
 * Inline another command's steps into this one — composition of behavior,
 * not of verification. The inlined command's own `pre`/`post` gates never
 * run: one node keeps exactly one verification boundary, the enclosing
 * command's own gates are the whole contract. An author who wants a
 * specific inner check back declares it explicitly in the outer `post`.
 */
export interface UseStep {
  readonly _tag: 'use';
  readonly command: CommandDefinition;
  readonly inputs: Readonly<Record<string, string | number | boolean>>;
}

export type Step = RunStep | JsonMergeStep | UseStep;

export interface CommandDefinition<I extends IOSchema = IOSchema, O extends IOSchema = IOSchema> {
  readonly kind: 'command';
  readonly name: string;
  readonly purpose: string;
  readonly steps: readonly Step[];
  readonly inputs: I;
  readonly outputs?: O;
  readonly permissions?: Permissions;
  readonly sandbox?: string;
  /** Deterministic checks run in the worktree before the effect. */
  readonly pre?: readonly Gate[];
  /** Checks in addition to the implicit exit-code gate. */
  readonly post?: readonly Gate[];
}
