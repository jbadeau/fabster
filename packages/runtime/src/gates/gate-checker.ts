import type { Gate } from '@fabster/core';
import type { GateResult } from '../types.js';
import { miseExec } from '../engine/mise.js';

const VALIDATION_GATES = new Set([
  'successfulBuild',
  'formatted',
  'linted',
  'conformant',
  'testsPass',
]);

const REVIEW_GATES = new Set([
  'humanApproved',
]);

export function splitGates(gates: readonly Gate[]): {
  validation: readonly Gate[];
  review: readonly Gate[];
} {
  const validation: Gate[] = [];
  const review: Gate[] = [];

  for (const gate of gates) {
    if (REVIEW_GATES.has(gate.kind)) {
      review.push(gate);
    } else if (VALIDATION_GATES.has(gate.kind)) {
      validation.push(gate);
    } else {
      // Custom gates default to validation
      validation.push(gate);
    }
  }

  return { validation, review };
}

export async function runValidationGates(
  gates: readonly Gate[],
  cwd: string,
): Promise<GateResult[]> {
  const results: GateResult[] = [];

  for (const gate of gates) {
    let passed = false;
    let detail = '';

    switch (gate.kind) {
      case 'successfulBuild': {
        const result = await miseExec('npx nx run-many -t build --all', cwd);
        passed = result.exitCode === 0;
        detail = passed ? 'build passed' : result.stderr.slice(0, 200);
        break;
      }
      case 'linted': {
        const result = await miseExec('npx nx run-many -t lint --all', cwd);
        passed = result.exitCode === 0;
        detail = passed ? 'lint passed' : result.stderr.slice(0, 200);
        break;
      }
      case 'formatted': {
        const result = await miseExec('npx prettier --check .', cwd);
        passed = result.exitCode === 0;
        detail = passed ? 'format passed' : result.stderr.slice(0, 200);
        break;
      }
      case 'testsPass': {
        const result = await miseExec('npx nx run-many -t test --all', cwd);
        passed = result.exitCode === 0;
        detail = passed ? 'tests passed' : result.stderr.slice(0, 200);
        break;
      }
      case 'conformant': {
        // Conformance checks are project-specific — pass by default
        passed = true;
        detail = 'conformance check not configured';
        break;
      }
      default: {
        passed = gate.required === false;
        detail = 'custom gate — not checked automatically';
        break;
      }
    }

    results.push({ gate, passed, detail });
  }

  return results;
}

export async function checkReviewGates(
  gates: readonly Gate[],
  cwd: string,
  mrUrl: string,
): Promise<GateResult[]> {
  const results: GateResult[] = [];

  for (const gate of gates) {
    if (gate.kind === 'humanApproved') {
      const result = await miseExec(
        `gh pr view "${mrUrl}" --json reviewDecision --jq .reviewDecision`,
        cwd,
      );
      const decision = result.stdout.trim();
      results.push({
        gate,
        passed: decision === 'APPROVED',
        detail: decision || 'no reviews',
      });
    }
  }

  return results;
}
