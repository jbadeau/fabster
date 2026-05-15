import type { Requirement } from '../types/capability.js';
import type { Gate } from '../types/gate.js';
import type { IOSchema } from '../types/io.js';
import type { Permissions } from '../types/common.js';
import type { ReasoningLevel, TaskDefinition } from '../types/task.js';

interface TaskConfig<I extends IOSchema> {
  readonly name: string;
  readonly purpose: string;
  readonly reasoning?: ReasoningLevel;
  readonly requirements: readonly Requirement[];
  readonly inputs: I;
  readonly permissions?: Permissions;
  readonly sandbox?: string;
  readonly gates?: readonly Gate[];
}

export function task<I extends IOSchema>(
  config: TaskConfig<I>,
): TaskDefinition<I> {
  return Object.freeze({
    kind: 'task' as const,
    ...config,
  });
}
