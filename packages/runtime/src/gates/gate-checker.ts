import { spawn } from 'node:child_process';
import type { ConformanceConfig, Gate } from '@fabster/core';
import type { GateResult } from '../types.js';
import { miseExec } from '../engine/mise.js';
import { isSandboxActive, sandboxWrap } from '../engine/sandbox.js';
import { safeEnv } from '../engine/safe-env.js';

function interpolate(
  template: string,
  inputs: Record<string, string | number | boolean>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in inputs ? String(inputs[key]) : match,
  );
}

function resolveDotPath(value: unknown, dotPath: string): unknown {
  return dotPath.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, value);
}

/** Substitute {name.path.to.field} against the sequence's captured responses so far. */
function resolveCaptures(value: string, captures: Record<string, unknown>): string {
  return value.replace(/\{(\w+(?:\.\w+)*)\}/g, (match, ref: string) => {
    const [name, ...rest] = ref.split('.');
    if (!(name in captures)) return match;
    const resolved = rest.length ? resolveDotPath(captures[name], rest.join('.')) : captures[name];
    return resolved === undefined ? match : String(resolved);
  });
}

function resolveBodyCaptures(value: unknown, captures: Record<string, unknown>): unknown {
  if (typeof value === 'string') return resolveCaptures(value, captures);
  if (Array.isArray(value)) return value.map((v) => resolveBodyCaptures(v, captures));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolveBodyCaptures(v, captures)]),
    );
  }
  return value;
}

async function waitUntilReady(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(
    `Service never became reachable at ${url} within ${timeoutMs}ms` +
      (lastError instanceof Error ? `: ${lastError.message}` : ''),
  );
}

async function runConformance(config: ConformanceConfig, cwd: string): Promise<{ passed: boolean; detail: string }> {
  // The started service is a long-running background process, not a
  // one-shot command miseExec can await — but it still needs the same
  // sandbox wrapping every other spawned process in this node gets, or a
  // conformance check would be the one thing in the node that silently
  // bypasses nono.
  const startCommand = isSandboxActive() ? sandboxWrap(config.start, cwd) : config.start;
  const child = spawn('sh', ['-c', startCommand], { cwd, env: safeEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (d: Buffer) => { output += d.toString(); });
  child.stderr.on('data', (d: Buffer) => { output += d.toString(); });

  try {
    await waitUntilReady(`${config.baseUrl}${config.readyPath ?? '/'}`, config.timeoutMs ?? 10_000);

    const captures: Record<string, unknown> = {};
    for (const [index, req] of config.requests.entries()) {
      const label = `request ${index + 1} (${req.method} ${req.path})`;
      const path = resolveCaptures(req.path, captures);
      const body = req.body === undefined ? undefined : resolveBodyCaptures(req.body, captures);

      let response: Response;
      try {
        response = await fetch(`${config.baseUrl}${path}`, {
          method: req.method,
          headers: body === undefined ? undefined : { 'content-type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { passed: false, detail: `${label}: request failed — ${message}` };
      }

      if (response.status !== req.expectStatus) {
        const bodyText = await response.text().catch(() => '');
        return {
          passed: false,
          detail: `${label}: expected status ${req.expectStatus}, got ${response.status}${bodyText ? ` — ${bodyText.slice(0, 300)}` : ''}`,
        };
      }

      let parsed: unknown;
      const hasBody = response.status !== 204;
      if (hasBody) {
        const text = await response.text();
        if (text) {
          try {
            parsed = JSON.parse(text);
          } catch {
            return { passed: false, detail: `${label}: response was not valid JSON: ${text.slice(0, 300)}` };
          }
        }
      }

      if (req.expectBody) {
        for (const [key, expected] of Object.entries(req.expectBody)) {
          const actual = resolveDotPath(parsed, key);
          if (actual !== expected) {
            return {
              passed: false,
              detail: `${label}: expected body.${key} to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
            };
          }
        }
      }

      if (req.capture) captures[req.capture] = parsed;
    }

    return { passed: true, detail: `${config.requests.length} request(s) all matched expectations` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { passed: false, detail: `${message}${output ? `\nservice output:\n${output.slice(-1000)}` : ''}` };
  } finally {
    child.kill();
  }
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
      case 'conformant': {
        if (!gate.conformance) {
          throw new Error(`Gate "conformant" has no conformance config`);
        }
        const outcome = await runConformance(gate.conformance, cwd);
        passed = outcome.passed;
        detail = outcome.detail;
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
