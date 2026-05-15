import type { CommandDefinition } from '../types/command.js';
import type { Gate } from '../types/gate.js';
import type { IOSchema } from '../types/io.js';
import type { Permissions } from '../types/common.js';

interface CommandConfig<I extends IOSchema> {
  readonly name: string;
  readonly purpose: string;
  readonly run: string | readonly string[];
  readonly inputs: I;
  readonly permissions?: Permissions;
  readonly sandbox?: string;
  readonly gates?: readonly Gate[];
}

export function command<I extends IOSchema>(
  config: CommandConfig<I>,
): CommandDefinition<I> {
  return Object.freeze({
    kind: 'command' as const,
    ...config,
  });
}
