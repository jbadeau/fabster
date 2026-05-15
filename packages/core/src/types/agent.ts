import type { ToolSet } from 'ai';
import type { Capability } from './capability.js';

export interface AgentDefinition<TOOLS extends ToolSet = ToolSet> {
  readonly kind: 'agent';
  readonly name: string;
  readonly purpose: string;
  readonly capabilities: readonly Capability[];
  readonly instructions: string;
  readonly tools: TOOLS;
}
