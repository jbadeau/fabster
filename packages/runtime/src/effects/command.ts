import type { CommandDefinition } from '@fabster/core';
import { miseExec } from '../engine/mise.js';
import type { Effect, EffectContext, EffectResult } from './types.js';

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

      for (const step of def.steps) {
        const script = interpolate(step.script, inputs);
        log(`> ${script}`);
        const result = await miseExec(script, ctx.cwd, def.permissions?.tools);

        if (result.stdout) log(result.stdout);

        if (result.exitCode !== 0) {
          log(`x exit ${result.exitCode}`);
          if (result.stderr) log(`stderr: ${result.stderr.slice(0, 500)}`);
          return {
            executed: false,
            logs,
            advisory: `exit ${result.exitCode}`,
          };
        }
        log(`+ done`);
      }

      return { executed: true, logs, advisory: 'exit 0' };
    },
  };
}
