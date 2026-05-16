import { generateText, stepCountIs } from 'ai';
import type { Workspace } from '@struktoai/mirage-core';
import type { NativeAgentDefinition, TaskDefinition } from '@fabster/core';
import type { ModelMap } from '../types.js';
import { bindToolsToWorkspace } from './tool-binder.js';

export async function executeTask(
  task: TaskDefinition,
  inputs: Record<string, string | number | boolean>,
  agentDef: NativeAgentDefinition,
  models: ModelMap,
  workspace: Workspace,
  diskRoot?: string,
  onLog?: (message: string) => void,
): Promise<{ text: string; finishReason: string }> {
  const reasoning = task.reasoning ?? 'medium';
  const model = models[reasoning];

  // Rebind agent tools to the real workspace
  const tools = bindToolsToWorkspace(agentDef.tools, workspace, diskRoot);

  const inputDescription = Object.entries(inputs)
    .map(([k, v]) => `- ${k}: ${String(v)}`)
    .join('\n');

  const prompt = [
    `You must complete the following task by using tools. Do NOT just describe what to do — use the writeFile, readFile, listDirectory, and runCommand tools to actually make changes.`,
    '',
    `## Task`,
    task.purpose,
    '',
    `## Inputs`,
    inputDescription,
    '',
    `## Instructions`,
    `1. Start by using listDirectory to explore the relevant project structure`,
    `2. Use readFile to understand existing code if needed`,
    `3. Use writeFile to create/modify all necessary files`,
    `4. Use runCommand to verify your changes (build, test, lint)`,
    `5. If anything fails, fix it and retry`,
    '',
    `Begin now. Use tools immediately.`,
  ].join('\n');

  const result = await generateText({
    model,
    tools,
    toolChoice: 'required',
    system: agentDef.instructions,
    prompt,
    stopWhen: stepCountIs(10),
    onStepFinish: ({ toolCalls, text, finishReason }) => {
      if (toolCalls?.length) {
        for (const tc of toolCalls) {
          const input = typeof tc.input === 'object' ? JSON.stringify(tc.input).slice(0, 100) : '';
          const msg = `[tool] ${tc.toolName} ${input}`;
          if (onLog) { onLog(msg); } else { console.log(`    ${msg}`); }
        }
      }
      if (text) {
        const msg = `[text] ${text.slice(0, 120)}${text.length > 120 ? '...' : ''}`;
        if (onLog) { onLog(msg); } else { console.log(`    ${msg}`); }
      }
      if (finishReason === 'stop') {
        const msg = '[done] Agent finished';
        if (onLog) { onLog(msg); } else { console.log(`    ${msg}`); }
      }
    },
  });

  return result;
}
