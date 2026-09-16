import type { AgentDefinition } from '@fabster/core';
import type { ResolvedNode } from '../types.js';
import { commandEffect } from '../effects/command.js';
import { externalAgentEffect } from '../effects/external-agent.js';
import { resolveAgent } from '../resolver/agent-resolver.js';

export interface NodeExecutionResult {
  readonly success: boolean;
  readonly logs: string[];
  readonly resolvedAgent?: string;
}

/**
 * Select and run the node's effect. The runner enforces sandboxing by
 * entering the sandbox before this call — every effect wraps its child
 * processes with nono using the node's declared permissions.
 */
export async function executeNode(
  node: ResolvedNode,
  resolvedInputs: Record<string, string | number | boolean>,
  agents: readonly AgentDefinition[],
  cwd: string,
  onLog?: (message: string) => void,
  retryEvidence?: string,
): Promise<NodeExecutionResult> {
  const logs: string[] = [];
  const def = node.definition;

  const log = (message: string) => {
    logs.push(message);
    onLog?.(message);
  };

  if (def.kind === 'command') {
    log(`Executing command: ${def.name}`);

    const effect = commandEffect(def, resolvedInputs);
    const result = await effect.execute({ cwd, onLog, retryEvidence });
    logs.push(...result.logs);

    // A command is deterministic: its exit code is itself a check.
    return { success: result.executed, logs };
  }

  if (def.kind === 'task') {
    log(`Executing task: ${def.name}`);
    log(`Reasoning level: ${def.reasoning ?? 'medium'}`);

    const agent = resolveAgent(def, agents);
    if (!agent) {
      log(`ERROR: No agent found matching requirements`);
      for (const req of def.requirements) {
        log(`  - ${req.namespace}: ${JSON.stringify(req.filter)}`);
      }
      return { success: false, logs };
    }

    log(`Resolved agent: ${agent.name} (${agent.adapter.command})`);

    const effect = externalAgentEffect(def, agent, resolvedInputs);
    const result = await effect.execute({ cwd, onLog, retryEvidence });
    logs.push(...result.logs);

    // A task's self-report is advisory: it is logged, but only post-gates
    // decide whether the node succeeded.
    if (result.advisory) {
      log(`[advisory] ${result.advisory}`);
    }

    return {
      success: result.executed,
      logs,
      resolvedAgent: agent.name,
    };
  }

  logs.push(`Unknown node kind: ${(def as { kind: string }).kind}`);
  return { success: false, logs };
}
