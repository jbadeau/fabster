import type {
  CommandAgentAdapter,
  ExternalAgentDefinition,
} from '../types/agent.js';
import type { Capability } from '../types/capability.js';

interface ExternalAgentConfig {
  readonly role: string;
  readonly goal: string;
  readonly backstory: string;
  readonly capabilities: readonly Capability[];
  readonly memory?: boolean;
  readonly allowDelegation?: boolean;
  readonly adapter: CommandAgentAdapter;
}

export function externalAgent(
  name: string,
  config: ExternalAgentConfig,
): ExternalAgentDefinition {
  return Object.freeze({
    kind: 'external-agent' as const,
    name,
    ...config,
  });
}

interface ClaudeCodeAgentConfig
  extends Omit<ExternalAgentConfig, 'adapter'> {
  readonly command?: string;
  readonly args?: readonly string[];
  readonly timeoutMs?: number;
}

export function claudeCodeAgent(
  name: string,
  config: ClaudeCodeAgentConfig,
): ExternalAgentDefinition {
  return externalAgent(name, {
    ...config,
    adapter: {
      kind: 'command',
      command: config.command ?? 'claude',
      args: config.args ?? ['-p', '{prompt}', '--max-turns', '30'],
      timeoutMs: config.timeoutMs,
    },
  });
}
