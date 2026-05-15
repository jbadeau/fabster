import type { LanguageModel } from 'ai';
import type {
  AgentDefinition,
  CommandDefinition,
  Gate,
  InputValue,
  TaskDefinition,
} from '@fabster/core';

export type NodeState =
  | 'pending'
  | 'executing'
  | 'validating'
  | 'publishing'
  | 'reviewing'
  | 'complete'
  | 'failed'
  | 'gated'
  | 'skipped';

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
  readonly state: NodeState;
  readonly branch: string;
  readonly mr?: string;
  readonly validationGates: readonly GateResult[];
  readonly reviewGates: readonly GateResult[];
  readonly duration: number;
  readonly logs: readonly string[];
  readonly outputs: Record<string, string | number | boolean>;
}

export interface GateResult {
  readonly gate: Gate;
  readonly passed: boolean;
  readonly detail?: string;
}

export interface ResolvedNode {
  readonly id: string;
  readonly definition: TaskDefinition | CommandDefinition;
  readonly inputs: Record<string, InputValue>;
  readonly dependsOn: readonly string[];
}
