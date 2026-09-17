import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CommandDefinition, Step } from '@fabster/core';
import { miseExec } from '../engine/mise.js';
import type { Effect, EffectContext, EffectResult } from './types.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(
  target: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    result[key] = isPlainObject(value) && isPlainObject(result[key])
      ? deepMerge(result[key] as Record<string, unknown>, value)
      : value;
  }
  return result;
}

function interpolate(
  template: string,
  inputs: Record<string, string | number | boolean>,
): string {
  // Only replace {key} patterns that match declared inputs.
  // Leave unknown {WORD} patterns untouched — they may be env var
  // references like ${FORGE_NPM_PUBLIC_REPO} in config files.
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (key in inputs) {
      return String(inputs[key]);
    }
    return match;
  });
}

/**
 * Run a step list in the worktree, recursing into `use()` steps. A `use`
 * step inlines another command's steps only — its own `pre`/`post` gates
 * never run here; the enclosing command's gates are the node's whole
 * verification contract (see UseStep in @fabster/core).
 */
async function runSteps(
  steps: readonly Step[],
  inputs: Record<string, string | number | boolean>,
  ctx: EffectContext,
  tools: readonly string[] | undefined,
  log: (message: string) => void,
  inUse: ReadonlySet<CommandDefinition>,
): Promise<string | null> {
  for (const step of steps) {
    if (step._tag === 'jsonMerge') {
      const filePath = interpolate(step.path, inputs);
      const absolutePath = path.join(ctx.cwd, filePath);
      log(`> merge ${filePath}`);
      try {
        const before = JSON.parse(await readFile(absolutePath, 'utf8')) as Record<string, unknown>;
        const after = deepMerge(before, step.patch);
        await writeFile(absolutePath, `${JSON.stringify(after, null, 2)}\n`);
        log(`  ${JSON.stringify(step.patch)}`);
        log(`+ done`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log(`x ${message}`);
        return message;
      }
      continue;
    }

    if (step._tag === 'use') {
      if (inUse.has(step.command)) {
        const message = `circular use(): "${step.command.name}" is already inlined in this chain`;
        log(`x ${message}`);
        return message;
      }
      const innerInputs: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(step.inputs)) {
        innerInputs[key] = typeof value === 'string' ? interpolate(value, inputs) : value;
      }
      log(`> use ${step.command.name}`);
      const failure = await runSteps(
        step.command.steps,
        innerInputs,
        ctx,
        tools,
        log,
        new Set(inUse).add(step.command),
      );
      if (failure) return failure;
      continue;
    }

    const script = interpolate(step.script, inputs);
    log(`> ${script}`);
    const result = await miseExec(script, ctx.cwd, tools);

    if (result.stdout) log(result.stdout);

    if (result.exitCode !== 0) {
      log(`x exit ${result.exitCode}`);
      if (result.stderr) log(`stderr: ${result.stderr.slice(0, 500)}`);
      return `exit ${result.exitCode}`;
    }
    log(`+ done`);
  }

  return null;
}

export function commandEffect(
  def: CommandDefinition,
  inputs: Record<string, string | number | boolean>,
): Effect {
  return {
    name: `command:${def.name}`,
    async execute(ctx: EffectContext): Promise<EffectResult> {
      const logs: string[] = [];
      const log = (message: string) => {
        logs.push(message);
        ctx.onLog?.(message);
      };

      const failure = await runSteps(def.steps, inputs, ctx, def.permissions?.tools, log, new Set([def]));

      if (failure) {
        return { executed: false, logs, advisory: failure };
      }
      return { executed: true, logs, advisory: 'exit 0' };
    },
  };
}
