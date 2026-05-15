import { generateText, stepCountIs } from 'ai';
import type { Workspace } from '@struktoai/mirage-core';
import type { AgentDefinition, TaskDefinition } from '@fabster/core';
import type { ModelMap } from '../types.js';
import { bindToolsToWorkspace } from './tool-binder.js';

export async function executeTask(
  task: TaskDefinition,
  inputs: Record<string, string | number | boolean>,
  agentDef: AgentDefinition,
  models: ModelMap,
  workspace: Workspace,
): Promise<{ text: string; finishReason: string }> {
  const reasoning = task.reasoning ?? 'medium';
  const model = models[reasoning];

  // Rebind agent tools to the real workspace
  const tools = bindToolsToWorkspace(agentDef.tools, workspace);

  const inputDescription = Object.entries(inputs)
    .map(([k, v]) => `- ${k}: ${String(v)}`)
    .join('\n');

  const prompt = [
    `Task: ${task.purpose}`,
    '',
    'Inputs:',
    inputDescription,
  ].join('\n');

  const result = await generateText({
    model,
    tools,
    system: agentDef.instructions,
    prompt,
    stopWhen: stepCountIs(20),
  });

  return result;
}
