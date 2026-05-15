import type {
  CommandDefinition,
  GraphContext,
  NodeHandle,
  TaskDefinition,
  WorkflowDefinition,
} from '@fabster/core';
import type { ResolvedNode } from '../types.js';

export function extractNodes(workflow: WorkflowDefinition): ResolvedNode[] {
  const nodes: ResolvedNode[] = [];

  const ctx: GraphContext = {
    run<D extends TaskDefinition | CommandDefinition>(
      id: string,
      definition: D,
      inputs: Record<string, string | number | boolean>,
      options?: { dependsOn?: readonly NodeHandle[] },
    ): NodeHandle {
      const dependsOn = options?.dependsOn?.map((h) => h.id) ?? [];

      if (nodes.some((n) => n.id === id)) {
        throw new Error(`Duplicate node id: "${id}"`);
      }

      for (const dep of dependsOn) {
        if (!nodes.some((n) => n.id === dep)) {
          throw new Error(
            `Node "${id}" depends on unknown node "${dep}"`,
          );
        }
      }

      nodes.push(Object.freeze({ id, definition, inputs, dependsOn }));
      return Object.freeze({ id });
    },
  };

  workflow.graph(ctx);

  return nodes;
}
