import type { CommandDefinition } from '../types/command.js';
import type { NodeHandle, OutputRef } from '../types/node.js';
import type { TaskDefinition } from '../types/task.js';
import type { GraphContext, InputValue, WorkflowDefinition } from '../types/workflow.js';
import type { WorkspaceDefinition } from '../types/workspace.js';

interface WorkflowConfig {
  readonly name: string;
  readonly purpose: string;
  readonly workspace: WorkspaceDefinition;
  readonly graph: (ctx: GraphContext) => void;
}

export interface InternalNode {
  readonly id: string;
  readonly definition: TaskDefinition | CommandDefinition;
  readonly inputs: Record<string, InputValue>;
  readonly dependsOn: readonly string[];
}

function createNodeHandle(id: string): NodeHandle {
  return {
    id,
    output(name: string): OutputRef {
      return Object.freeze({
        _tag: 'outputRef' as const,
        nodeId: id,
        outputName: name,
      });
    },
  };
}

function createGraphContext(nodes: InternalNode[]): GraphContext {
  return {
    run<D extends TaskDefinition | CommandDefinition>(
      id: string,
      definition: D,
      inputs: Record<string, InputValue>,
      options?: { dependsOn?: readonly NodeHandle[] },
    ): NodeHandle {
      const dependsOn = options?.dependsOn?.map((h) => h.id) ?? [];
      nodes.push(Object.freeze({ id, definition, inputs, dependsOn }));
      return createNodeHandle(id);
    },
  };
}

export function workflow(config: WorkflowConfig): WorkflowDefinition {
  // Eagerly evaluate the graph to capture nodes for validation
  const nodes: InternalNode[] = [];
  const ctx = createGraphContext(nodes);
  config.graph(ctx);

  return Object.freeze({
    kind: 'workflow' as const,
    name: config.name,
    purpose: config.purpose,
    workspace: config.workspace,
    graph: config.graph,
  });
}
