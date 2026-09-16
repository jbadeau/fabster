// Public API
export { runWorkflow } from './engine/runner.js';
export { extractNodes } from './engine/graph.js';
export { resolveAgent } from './resolver/agent-resolver.js';
export { createWorkflowEmitter } from './types.js';

// Node lifecycle + git primitives, for durable engines (@fabster/engine)
export {
  resolveInputs,
  runNode,
  type NodeOutputs,
  type NodeRunOutcome,
  type NodeRunParams,
} from './engine/node-lifecycle.js';
export {
  branchExists,
  createRunBranch,
  ensureInitialCommit,
} from './git/branch.js';
export { createMR } from './git/mr.js';

// Types
export type {
  RunOptions,
  RunResult,
  NodeResult,
  NodeState,
  GateResult,
  ResolvedNode,
  WorkflowEvent,
  WorkflowEmitter,
} from './types.js';
