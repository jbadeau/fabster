import type { CommandDefinition } from '@fabster/core';
import { miseExec } from './mise.js';

function interpolate(
  template: string,
  inputs: Record<string, string | number | boolean>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key in inputs) {
      return String(inputs[key]);
    }
    throw new Error(`Missing input "${key}" for command interpolation`);
  });
}

export async function executeCommand(
  command: CommandDefinition,
  inputs: Record<string, string | number | boolean>,
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const commands =
    typeof command.run === 'string' ? [command.run] : [...command.run];

  let lastResult = { exitCode: 0, stdout: '', stderr: '' };

  for (const cmd of commands) {
    const interpolated = interpolate(cmd, inputs);
    console.log(`    > ${interpolated}`);
    lastResult = await miseExec(interpolated, cwd, command.permissions?.tools);

    if (lastResult.exitCode !== 0) {
      console.log(`    x exit ${lastResult.exitCode}`);
      return lastResult;
    }
    console.log(`    + done`);
  }

  return lastResult;
}
