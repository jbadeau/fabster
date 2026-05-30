import { EventEmitter } from 'node:events';
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
  | 'retrying'
  | 'complete'
  | 'failed'
  | 'gated'
  | 'skipped';

export type WorkflowEvent =
  | { type: 'node:state'; nodeId: string; state: NodeState; log?: string }
  | { type: 'node:log'; nodeId: string; message: string }
  | { type: 'node:gate'; nodeId: string; gate: GateResult }
  | { type: 'node:agent'; nodeId: string; agentName: string }
  | { type: 'node:mr'; nodeId: string; mr: string }
  | { type: 'node:retry'; nodeId: string; attempt: number; maxAttempts: number; evidence: string }
  | { type: 'workflow:done'; status: 'success' | 'failed' | 'gated' };

export interface WorkflowEmitter extends EventEmitter {
  emit(event: 'progress', data: WorkflowEvent): boolean;
  on(event: 'progress', listener: (data: WorkflowEvent) => void): this;
}

export function createWorkflowEmitter(): WorkflowEmitter {
  return new EventEmitter() as WorkflowEmitter;
}

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
  readonly emitter?: WorkflowEmitter;
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
