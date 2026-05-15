import type { ToolSet } from 'ai';
import type { AgentDefinition } from '../types/agent.js';
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
): AgentDefinition<TOOLS> {
  return Object.freeze({
    kind: 'agent' as const,
    name,
    ...config,
  });
}
