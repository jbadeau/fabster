import type {
  CommandDefinition,
  GraphContext,
  InputValue,
  NodeHandle,
  OutputRef,
  TaskDefinition,
  WorkflowDefinition,
} from '@fabster/core';
import type { ResolvedNode } from '../types.js';

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

export function extractNodes(workflow: WorkflowDefinition): ResolvedNode[] {
  const nodes: ResolvedNode[] = [];

  const ctx: GraphContext = {
    run<D extends TaskDefinition | CommandDefinition>(
      id: string,
      definition: D,
      inputs: Record<string, InputValue>,
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

      // Auto-add dependsOn for any OutputRef inputs
      for (const value of Object.values(inputs)) {
        if (typeof value === 'object' && value !== null && '_tag' in value && value._tag === 'outputRef') {
          const ref = value as OutputRef;
          if (!dependsOn.includes(ref.nodeId) && !nodes.some((n) => n.id === ref.nodeId)) {
            throw new Error(
              `Node "${id}" references output from unknown node "${ref.nodeId}"`,
            );
          }
          if (!dependsOn.includes(ref.nodeId)) {
            dependsOn.push(ref.nodeId);
          }
        }
      }

      nodes.push(Object.freeze({ id, definition, inputs, dependsOn }));
      return createNodeHandle(id);
    },
  };

  workflow.graph(ctx);

  return nodes;
}
