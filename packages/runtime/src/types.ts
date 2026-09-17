import { EventEmitter } from 'node:events';
import type {
  AgentDefinition,
  CommandDefinition,
  Gate,
  InputValue,
  TaskDefinition,
} from '@fabster/core';
import type { SandboxPolicy } from './engine/sandbox.js';

export type NodeState =
  | 'pending'
  | 'executing'
  | 'validating'
  | 'publishing'
  | 'retrying'
  | 'complete'
  | 'failed'
  | 'skipped';

export type WorkflowEvent =
  | { type: 'node:state'; nodeId: string; state: NodeState; log?: string }
  | { type: 'node:log'; nodeId: string; message: string }
  | { type: 'node:gate'; nodeId: string; gate: GateResult }
  | { type: 'node:agent'; nodeId: string; agentName: string }
  | { type: 'node:retry'; nodeId: string; attempt: number; maxAttempts: number; evidence: string }
  | { type: 'workflow:mr'; mr: string }
  | { type: 'workflow:done'; status: 'success' | 'failed' | 'gated' };

export interface WorkflowEmitter extends EventEmitter {
  emit(event: 'progress', data: WorkflowEvent): boolean;
  on(event: 'progress', listener: (data: WorkflowEvent) => void): this;
}

export function createWorkflowEmitter(): WorkflowEmitter {
  return new EventEmitter() as WorkflowEmitter;
}

export interface RunOptions {
  readonly agents: readonly AgentDefinition[];
  readonly ui?: boolean;
  readonly dryRun?: boolean;
  readonly emitter?: WorkflowEmitter;
  /** Defaults to 'required' — a missing nono fails the run rather than executing unsandboxed. */
  readonly sandbox?: SandboxPolicy;
}

export interface RunResult {
  readonly workflow: string;
  readonly nodes: readonly NodeResult[];
  readonly status: 'success' | 'failed' | 'gated';
  /** The run's merge request, when the workflow declares mergeRequest delivery. */
  readonly mr?: string;
}

export interface NodeResult {
  readonly id: string;
  readonly definition: TaskDefinition | CommandDefinition;
  readonly state: NodeState;
  readonly branch: string;
  readonly entryGates: readonly GateResult[];
  readonly postGates: readonly GateResult[];
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
