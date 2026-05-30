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
  onLog?: (message: string) => void,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const commands = command.steps.map(s => s.script);
  const log = (msg: string) => {
    if (onLog) { onLog(msg); } else { console.log(`    ${msg}`); }
  };

  let lastResult = { exitCode: 0, stdout: '', stderr: '' };

  for (const cmd of commands) {
    const interpolated = interpolate(cmd, inputs);
    log(`> ${interpolated}`);
    lastResult = await miseExec(interpolated, cwd, command.permissions?.tools);

    if (lastResult.exitCode !== 0) {
      log(`x exit ${lastResult.exitCode}`);
      if (lastResult.stderr) log(`stderr: ${lastResult.stderr.slice(0, 500)}`);
      return lastResult;
    }
    log(`+ done`);
  }

  return lastResult;
}
