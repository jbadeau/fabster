import type { Capability } from './capability.js';

export interface CommandAgentAdapter {
  readonly kind: 'command';
  readonly command: string;
  readonly args?: readonly string[];
  readonly timeoutMs?: number;
}

export interface ExternalAgentDefinition {
  readonly kind: 'external-agent';
  readonly name: string;
  readonly role: string;
  readonly goal: string;
  readonly backstory: string;
  readonly capabilities: readonly Capability[];
  readonly memory?: boolean;
  readonly allowDelegation?: boolean;
  readonly adapter: CommandAgentAdapter;
}

/**
 * Agents are external harnesses invoked as black-box subprocesses. The
 * engine never trusts their self-report — post-gates decide node success.
 */
export type AgentDefinition = ExternalAgentDefinition;
