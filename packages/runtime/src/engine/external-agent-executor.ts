import { spawn } from 'node:child_process';
import type { ExternalAgentDefinition, TaskDefinition } from '@fabster/core';
import { isSandboxActive, sandboxWrap } from './sandbox.js';

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
  retryEvidence?: string,
): string {
  const inputDescription = Object.entries(inputs)
    .map(([key, value]) => `- ${key}: ${String(value)}`)
    .join('\n');

  return [
    agent.backstory,
    `Your role: ${agent.role}`,
    `Your goal: ${agent.goal}`,
    '',
    `You are executing a Fabster workflow task.`,
    '',
    `## Task`,
    task.purpose,
    '',
    ...(task.instructions?.length ? ['', '## Instructions', ...task.instructions.map(i => `- ${i}`)] : []),
    ...(task.rules?.length ? ['', '## Rules (expected output properties)', ...task.rules.map(r => `- ${r}`)] : []),
    '',
    `## Inputs`,
    inputDescription || '- none',
    '',
    `## Repository`,
    cwd,
    '',
    `## Constraints`,
    `- Modify files only inside the repository root above.`,
    `- Do not create commits, branches, pull requests, or merge requests.`,
    `- Run the verification commands that are appropriate for the change.`,
    `- Stop when the requested implementation is complete.`,
    `- Report the files changed and verification results.`,
    ...(retryEvidence ? [
      '',
      `## Previous Attempt Failed`,
      retryEvidence,
      '',
      `Fix the issues above and try again.`,
    ] : []),
  ]
    .filter((part): part is string => Boolean(part))
    .join('\n');
}

export async function executeExternalAgentTask(
  task: TaskDefinition,
  inputs: Record<string, string | number | boolean>,
  agent: ExternalAgentDefinition,
  cwd: string,
  onLog?: (message: string) => void,
  retryEvidence?: string,
): Promise<ExternalAgentExecutionResult> {
  const prompt = buildPrompt(task, inputs, agent, cwd, retryEvidence);
  const { command, args = [], timeoutMs } = agent.adapter;
  const resolvedArgs = args.map((arg) =>
    arg === '{prompt}' ? prompt : arg,
  );
  const writesPromptToStdin = !args.includes('{prompt}');

  // If sandbox is active, wrap the agent command with nono
  let spawnCommand = command;
  let spawnArgs = [...resolvedArgs];
  if (isSandboxActive()) {
    const fullCmd = [command, ...resolvedArgs].join(' ');
    const wrapped = sandboxWrap(fullCmd, cwd);
    const parts = wrapped.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [wrapped];
    spawnCommand = parts[0];
    spawnArgs = parts.slice(1);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(spawnCommand, spawnArgs, {
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
      if (onLog) {
        for (const line of chunk.split('\n').filter(Boolean)) {
          onLog(line);
        }
      }
    });

    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
      if (onLog) {
        for (const line of chunk.split('\n').filter(Boolean)) {
          onLog(`[stderr] ${line}`);
        }
      }
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
