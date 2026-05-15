import type { Workspace } from '@struktoai/mirage-core';
import type { AgentDefinition, ExternalAgentDefinition } from '@fabster/core';
import type { ModelMap, ResolvedNode } from '../types.js';
import { executeCommand } from './command-executor.js';
import { executeTask } from './task-executor.js';
import { executeExternalAgentTask } from './external-agent-executor.js';
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
    collectDeclaredOutputs(def, resolvedInputs, outputs);

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

    if (agent.kind === 'external-agent') {
      logs.push(`External adapter: ${formatExternalAdapter(agent)}`);
      const result = await executeExternalAgentTask(def, resolvedInputs, agent, cwd);

      if (result.stdout) logs.push(result.stdout);
      if (result.stderr) logs.push(result.stderr);

      collectDeclaredOutputs(def, resolvedInputs, outputs);

      return {
        success: result.success,
        logs,
        outputs,
      };
    }

    const result = await executeTask(def, resolvedInputs, agent, models, workspace, cwd);
    if (result.text) {
      logs.push(result.text);
    }

    // For tasks, pass declared output values from inputs
    // (same as commands — the workflow provides the values)
    collectDeclaredOutputs(def, resolvedInputs, outputs);

    return {
      success: result.finishReason === 'stop',
      logs,
      outputs,
    };
  }

  logs.push(`Unknown node kind: ${(def as { kind: string }).kind}`);
  return { success: false, logs, outputs };
}

function collectDeclaredOutputs(
  def: ResolvedNode['definition'],
  resolvedInputs: Record<string, string | number | boolean>,
  outputs: Record<string, string | number | boolean>,
): void {
  if (!def.outputs) return;

  for (const key of Object.keys(def.outputs)) {
    if (key in resolvedInputs) {
      outputs[key] = resolvedInputs[key];
    }
  }
}

function formatExternalAdapter(agent: ExternalAgentDefinition): string {
  const args = agent.adapter.args?.join(' ') ?? '';
  return [agent.adapter.command, args].filter(Boolean).join(' ');
}
