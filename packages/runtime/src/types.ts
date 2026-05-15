import type { LanguageModel } from 'ai';
import type {
  AgentDefinition,
  CommandDefinition,
  Gate,
  TaskDefinition,
} from '@fabster/core';

export type NodeStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'gated';

export interface ModelMap {
  readonly low: LanguageModel;
  readonly medium: LanguageModel;
  readonly high: LanguageModel;
}

export interface RunOptions {
  readonly agents: readonly AgentDefinition[];
  readonly models: ModelMap;
  readonly ui?: boolean;
  readonly dryRun?: boolean;
}

export interface RunResult {
  readonly workflow: string;
  readonly nodes: readonly NodeResult[];
  readonly status: 'success' | 'failed' | 'gated';
}

export interface NodeResult {
  readonly id: string;
  readonly definition: TaskDefinition | CommandDefinition;
  readonly status: NodeStatus;
  readonly branch: string;
  readonly mr?: string;
  readonly gates: readonly GateResult[];
  readonly duration: number;
  readonly logs: readonly string[];
}

export interface GateResult {
  readonly gate: Gate;
  readonly passed: boolean;
  readonly detail?: string;
}

export interface ResolvedNode {
  readonly id: string;
  readonly definition: TaskDefinition | CommandDefinition;
  readonly inputs: Record<string, string | number | boolean>;
  readonly dependsOn: readonly string[];
}
