import type { ToolSet } from 'ai';
import type { Capability } from './capability.js';

export interface NativeAgentDefinition<TOOLS extends ToolSet = ToolSet> {
  readonly kind: 'agent';
  readonly name: string;
  readonly purpose: string;
  readonly capabilities: readonly Capability[];
  readonly instructions: string;
  readonly tools: TOOLS;
}

export interface CommandAgentAdapter {
  readonly kind: 'command';
  readonly command: string;
  readonly args?: readonly string[];
  readonly timeoutMs?: number;
}

export interface ExternalAgentDefinition {
  readonly kind: 'external-agent';
  readonly name: string;
  readonly purpose: string;
  readonly capabilities: readonly Capability[];
  readonly instructions?: string;
  readonly adapter: CommandAgentAdapter;
}

export type AgentDefinition<TOOLS extends ToolSet = ToolSet> =
  | NativeAgentDefinition<TOOLS>
  | ExternalAgentDefinition;
