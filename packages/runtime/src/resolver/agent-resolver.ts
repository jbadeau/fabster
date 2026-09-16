import type { AgentDefinition, Requirement, TaskDefinition } from '@fabster/core';

function capabilitySatisfies(
  capability: { namespace: string; attributes: Record<string, unknown> },
  requirement: Requirement,
): boolean {
  if (capability.namespace !== requirement.namespace) {
    return false;
  }

  for (const [key, value] of Object.entries(requirement.filter)) {
    const attr = capability.attributes[key];
    if (attr === undefined) return false;

    if (Array.isArray(value)) {
      if (!Array.isArray(attr)) return false;
      if (!value.every((v) => (attr as unknown[]).includes(v))) return false;
    } else if (attr !== value) {
      return false;
    }
  }

  return true;
}

function agentSatisfiesRequirement(
  agent: AgentDefinition,
  requirement: Requirement,
): boolean {
  return agent.capabilities.some((cap) =>
    capabilitySatisfies(cap, requirement),
  );
}

export function resolveAgent(
  task: TaskDefinition,
  agents: readonly AgentDefinition[],
): AgentDefinition | null {
  for (const agent of agents) {
    const allSatisfied = task.requirements.every(
      (req) => req.optional || agentSatisfiesRequirement(agent, req),
    );
    if (allSatisfied) {
      return agent;
    }
  }
  return null;
}
