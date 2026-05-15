import type { CommandDefinition } from './command.js';
import type { NodeHandle } from './node.js';
import type { TaskDefinition } from './task.js';
import type { WorkspaceDefinition } from './workspace.js';

export interface GraphContext {
  run<D extends TaskDefinition | CommandDefinition>(
    id: string,
    definition: D,
    inputs: Record<string, string | number | boolean>,
    options?: { dependsOn?: readonly NodeHandle[] },
  ): NodeHandle;
}

export interface WorkflowDefinition {
  readonly kind: 'workflow';
  readonly name: string;
  readonly purpose: string;
  readonly workspace: WorkspaceDefinition;
  readonly graph: (ctx: GraphContext) => void;
}
