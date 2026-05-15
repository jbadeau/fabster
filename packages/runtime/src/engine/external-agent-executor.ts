import { spawn } from 'node:child_process';
import type { ExternalAgentDefinition, TaskDefinition } from '@fabster/core';

export interface ExternalAgentExecutionResult {
  readonly success: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
}

function buildPrompt(
  task: TaskDefinition,
  inputs: Record<string, string | number | boolean>,
  agent: ExternalAgentDefinition,
  cwd: string,
): string {
  const inputDescription = Object.entries(inputs)
    .map(([key, value]) => `- ${key}: ${String(value)}`)
    .join('\n');

  return [
    agent.instructions,
    `You are executing a Fabster workflow task.`,
    '',
    `## Task`,
    task.purpose,
    '',
    `## Inputs`,
    inputDescription || '- none',
    '',
    `## Repository`,
    cwd,
    '',
    `## Rules`,
    `- Modify files only inside the repository root above.`,
    `- Do not create commits, branches, pull requests, or merge requests.`,
    `- Run the verification commands that are appropriate for the change.`,
    `- Stop when the requested implementation is complete.`,
    `- Report the files changed and verification results.`,
  ]
    .filter((part): part is string => Boolean(part))
    .join('\n');
}

export async function executeExternalAgentTask(
  task: TaskDefinition,
  inputs: Record<string, string | number | boolean>,
  agent: ExternalAgentDefinition,
  cwd: string,
): Promise<ExternalAgentExecutionResult> {
  const prompt = buildPrompt(task, inputs, agent, cwd);
  const { command, args = [], timeoutMs } = agent.adapter;
  const resolvedArgs = args.map((arg) =>
    arg === '{prompt}' ? prompt : arg,
  );
  const writesPromptToStdin = !args.includes('{prompt}');

  return new Promise((resolve, reject) => {
    const child = spawn(command, resolvedArgs, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout =
      timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            child.kill('SIGTERM');
          }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      if (timeout) clearTimeout(timeout);
      if (!settled) {
        settled = true;
        reject(error);
      }
    });

    child.on('close', (exitCode, signal) => {
      if (timeout) clearTimeout(timeout);
      if (!settled) {
        settled = true;
        resolve({
          success: exitCode === 0,
          stdout,
          stderr,
          exitCode,
          signal,
        });
      }
    });

    child.stdin.end(writesPromptToStdin ? prompt : undefined);
  });
}
