import { generateText, stepCountIs } from 'ai';
import type { NativeAgentDefinition, TaskDefinition } from '@fabster/core';
import type { ModelMap } from '../types.js';

export async function executeTask(
  task: TaskDefinition,
  inputs: Record<string, string | number | boolean>,
  agentDef: NativeAgentDefinition,
  models: ModelMap,
  cwd: string,
  onLog?: (message: string) => void,
  retryEvidence?: string,
): Promise<{ text: string; finishReason: string }> {
  const reasoning = task.reasoning ?? 'medium';
  const model = models[reasoning];

  // Use agent tools directly — they operate on the filesystem via their own execute functions
  const tools = agentDef.tools;

  const inputDescription = Object.entries(inputs)
    .map(([k, v]) => `- ${k}: ${String(v)}`)
    .join('\n');

  const prompt = [
    `You must complete the following task by using tools.`,
    '',
    `## Task`,
    task.purpose,
    '',
    `## Inputs`,
    inputDescription,
    '',
    ...(task.instructions?.length ? [
      `## Instructions`,
      ...task.instructions.map(i => `- ${i}`),
      '',
    ] : []),
    ...(task.rules?.length ? [
      `## Rules`,
      ...task.rules.map(r => `- ${r}`),
      '',
    ] : []),
    ...(retryEvidence ? [
      `## Previous Attempt Failed`,
      retryEvidence,
      '',
      `Fix the issues above and try again.`,
      '',
    ] : []),
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
