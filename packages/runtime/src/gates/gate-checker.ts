import type { Gate } from '@fabster/core';
import type { GateResult } from '../types.js';
import { miseExec } from '../engine/mise.js';

async function checkGate(
  gate: Gate,
  cwd: string,
  mrUrl: string,
): Promise<GateResult> {
  switch (gate.kind) {
    case 'humanApproved': {
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

    case 'successfulBuild':
    case 'linted':
    case 'formatted':
    case 'testsPass':
    case 'conformant': {
      const result = await miseExec(
        `gh pr checks "${mrUrl}" --json name,state --jq '.[].state'`,
        cwd,
      );
      const states = result.stdout.trim().split('\n').filter(Boolean);
      const allPassed = states.length > 0 && states.every((s) => s === 'SUCCESS' || s === 'PASS');
      return {
        gate,
        passed: allPassed,
        detail: allPassed
          ? 'all checks passed'
          : `${states.filter((s) => s !== 'SUCCESS' && s !== 'PASS').length} checks pending/failed`,
      };
    }

    default: {
      return {
        gate,
        passed: gate.required === false,
        detail: 'custom gate — manual verification required',
      };
    }
  }
}

export async function checkGates(
  gates: readonly Gate[],
  cwd: string,
  mrUrl: string,
): Promise<GateResult[]> {
  const results: GateResult[] = [];

  for (const gate of gates) {
    const result = await checkGate(gate, cwd, mrUrl);
    results.push(result);
  }

  return results;
}
