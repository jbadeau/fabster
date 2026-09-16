import type { Requirement } from '../types/capability.js';
import type { Gate } from '../types/gate.js';
import type { IOSchema } from '../types/io.js';
import type { Permissions } from '../types/common.js';
import type { ReasoningLevel, TaskDefinition } from '../types/task.js';

interface TaskConfig<I extends IOSchema, O extends IOSchema> {
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
  readonly pre?: readonly Gate[];
  readonly post: readonly Gate[];
  readonly retries?: number;
}

export function task<I extends IOSchema, O extends IOSchema = IOSchema>(
  config: TaskConfig<I, O>,
): TaskDefinition<I, O> {
  if (!config.post || config.post.length === 0) {
    throw new Error(
      `Task "${config.name}" declares no post-gates. A task is probabilistic — its output must be externally verified, so at least one post-gate is required (e.g. successfulBuild(), testsPass()).`,
    );
  }
  return Object.freeze({
    kind: 'task' as const,
    ...config,
  });
}
