import type { Gate } from './gate.js';
import type { IOSchema } from './io.js';
import type { Permissions } from './common.js';

export interface CommandDefinition<I extends IOSchema = IOSchema> {
  readonly kind: 'command';
  readonly name: string;
  readonly purpose: string;
  readonly run: string | readonly string[];
  readonly inputs: I;
  readonly permissions?: Permissions;
  readonly sandbox?: string;
  readonly gates?: readonly Gate[];
}
