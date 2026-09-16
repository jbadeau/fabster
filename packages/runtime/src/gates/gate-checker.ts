import type { Gate } from '@fabster/core';
import type { GateResult } from '../types.js';
import { miseExec } from '../engine/mise.js';

function interpolate(
  template: string,
  inputs: Record<string, string | number | boolean>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in inputs ? String(inputs[key]) : match,
  );
}

/**
 * Detect which package manager the project uses.
 */
async function detectPackageManager(cwd: string): Promise<'pnpm' | 'npm'> {
  const fs = await import('node:fs');
  const path = await import('node:path');
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml')) || fs.existsSync(path.join(cwd, 'pnpm-workspace.yaml'))) {
    return 'pnpm';
  }
  return 'npm';
}

export async function runGates(
  gates: readonly Gate[],
  cwd: string,
  inputs: Record<string, string | number | boolean> = {},
): Promise<GateResult[]> {
  const results: GateResult[] = [];
  const pm = await detectPackageManager(cwd);
  const nxCmd = pm === 'pnpm' ? 'pnpm exec nx' : 'npm exec nx --';
  const tools = pm === 'pnpm' ? ['node', 'pnpm'] : ['node', 'npm'];

  for (const gate of gates) {
    let passed = false;
    let detail = '';

    switch (gate.kind) {
      case 'successfulBuild': {
        const result = await miseExec(`${nxCmd} affected -t build`, cwd, tools);
        passed = result.exitCode === 0;
        detail = passed ? 'build passed' : [result.stderr, result.stdout].filter(Boolean).join('\n').slice(0, 500);
        break;
      }
      case 'linted': {
        const result = await miseExec(`${nxCmd} affected -t lint`, cwd, tools);
        passed = result.exitCode === 0;
        detail = passed ? 'lint passed' : [result.stderr, result.stdout].filter(Boolean).join('\n').slice(0, 500);
        break;
      }
      case 'formatted': {
        const result = await miseExec(`${nxCmd} format:check`, cwd, tools);
        passed = result.exitCode === 0;
        detail = passed ? 'format passed' : [result.stderr, result.stdout].filter(Boolean).join('\n').slice(0, 500);
        break;
      }
      case 'testsPass': {
        const result = await miseExec(`${nxCmd} affected -t test`, cwd, tools);
        passed = result.exitCode === 0;
        detail = passed ? 'tests passed' : [result.stderr, result.stdout].filter(Boolean).join('\n').slice(0, 500);
        break;
      }
      default: {
        if (!gate.check) {
          throw new Error(`Gate "${gate.kind}" has no check script`);
        }
        // Custom checks run as written — the worktree's provisioned tools
        // are on PATH; no package-manager wrapper is forced on them.
        const script = interpolate(gate.check, inputs);
        const result = await miseExec(script, cwd);
        passed = result.exitCode === 0;
        detail = passed
          ? `${gate.kind} passed`
          : [result.stderr, result.stdout].filter(Boolean).join('\n').slice(0, 500);
        break;
      }
    }

    results.push({ gate, passed, detail });
  }

  return results;
}

/**
 * Check whether the run's merge request has been approved by a human.
 * This is the run-level exit criterion, not a node gate.
 */
export async function checkDeliveryReview(
  cwd: string,
  mrUrl: string,
): Promise<GateResult> {
  const gate: Gate = {
    kind: 'mergeRequestApproved',
    description: 'Human review of the run merge request',
  };

  const result = await miseExec(
    `gh pr view "${mrUrl}" --json reviewDecision --jq .reviewDecision`,
    cwd,
  );
  const decision = result.stdout.trim();

  return {
    gate,
    passed: decision === 'APPROVED',
    detail: decision || 'no reviews',
  };
}
