export type NodeStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'gated';

export type WorkflowStatus = 'running' | 'success' | 'failed' | 'gated';

export interface GateInfo {
  readonly kind: string;
  readonly passed: boolean;
  readonly detail?: string;
}

export interface NodeInfo {
  readonly id: string;
  readonly name: string;
  readonly type: 'command' | 'task';
  readonly status: NodeStatus;
  readonly reasoning?: 'low' | 'medium' | 'high';
  readonly agent?: string;
  readonly branch: string;
  readonly mr?: string;
  readonly duration: number;
  readonly gates: readonly GateInfo[];
  readonly logs: readonly string[];
  readonly inputs: Record<string, string | number | boolean>;
  readonly errors: readonly string[];
}

export interface WorkflowInfo {
  readonly name: string;
  readonly status: WorkflowStatus;
  readonly elapsed: number;
  readonly nodes: readonly NodeInfo[];
}
