import type { Workspace } from '@struktoai/mirage-core';
import type { AgentDefinition } from '@fabster/core';
import type { ModelMap, ResolvedNode } from '../types.js';
import { executeCommand } from './command-executor.js';
import { executeTask } from './task-executor.js';
import { resolveAgent } from '../resolver/agent-resolver.js';

export interface NodeExecutionResult {
  readonly success: boolean;
  readonly logs: string[];
  readonly outputs: Record<string, string | number | boolean>;
}

export async function executeNode(
  node: ResolvedNode,
  resolvedInputs: Record<string, string | number | boolean>,
  agents: readonly AgentDefinition[],
  models: ModelMap,
  workspace: Workspace,
  cwd: string,
): Promise<NodeExecutionResult> {
  const logs: string[] = [];
  const outputs: Record<string, string | number | boolean> = {};
  const def = node.definition;

  if (def.kind === 'command') {
    logs.push(`Executing command: ${def.name}`);

    const commands =
      typeof def.run === 'string' ? [def.run] : [...def.run];
    for (const cmd of commands) {
      logs.push(`> ${cmd}`);
    }

    const result = await executeCommand(def, resolvedInputs, cwd);
    if (result.stdout) logs.push(result.stdout);
    if (result.stderr) logs.push(result.stderr);

    // For commands, pass declared output values from inputs
    // (the workflow author wires the known paths/values)
    if (def.outputs) {
      for (const key of Object.keys(def.outputs)) {
        if (key in resolvedInputs) {
          outputs[key] = resolvedInputs[key];
        }
      }
    }

    return {
      success: result.exitCode === 0,
      logs,
      outputs,
    };
  }

  if (def.kind === 'task') {
    logs.push(`Executing task: ${def.name}`);
    logs.push(`Reasoning level: ${def.reasoning ?? 'medium'}`);

    const agent = resolveAgent(def, agents);
    if (!agent) {
      logs.push(`ERROR: No agent found matching requirements`);
      for (const req of def.requirements) {
        logs.push(`  - ${req.namespace}: ${JSON.stringify(req.filter)}`);
      }
      return { success: false, logs, outputs };
    }

    logs.push(`Resolved agent: ${agent.name}`);

    const result = await executeTask(def, resolvedInputs, agent, models, workspace, cwd);
    if (result.text) {
      logs.push(result.text);
    }

    // For tasks, pass declared output values from inputs
    // (same as commands — the workflow provides the values)
    if (def.outputs) {
      for (const key of Object.keys(def.outputs)) {
        if (key in resolvedInputs) {
          outputs[key] = resolvedInputs[key];
        }
      }
    }

    return {
      success: result.finishReason === 'stop',
      logs,
      outputs,
    };
  }

  logs.push(`Unknown node kind: ${(def as { kind: string }).kind}`);
  return { success: false, logs, outputs };
}
