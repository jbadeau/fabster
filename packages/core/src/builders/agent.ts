import type { ToolSet } from 'ai';
import type {
  CommandAgentAdapter,
  ExternalAgentDefinition,
  NativeAgentDefinition,
} from '../types/agent.js';
import type { Capability } from '../types/capability.js';

interface AgentConfig<TOOLS extends ToolSet> {
  readonly purpose: string;
  readonly capabilities: readonly Capability[];
  readonly instructions: string;
  readonly tools: TOOLS;
}

export function agent<TOOLS extends ToolSet>(
  name: string,
  config: AgentConfig<TOOLS>,
): NativeAgentDefinition<TOOLS> {
  return Object.freeze({
    kind: 'agent' as const,
    name,
    ...config,
  });
}

interface ExternalAgentConfig {
  readonly purpose: string;
  readonly capabilities: readonly Capability[];
  readonly instructions?: string;
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
      args: config.args ?? ['-p', '--max-turns', '30'],
      timeoutMs: config.timeoutMs,
    },
  });
}
