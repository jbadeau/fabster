import type { AgentDefinition, InputValue } from '@fabster/core';
import type { GateResult, NodeResult, NodeState, ResolvedNode, WorkflowEvent } from '../types.js';
import { executeNode } from './node-executor.js';
import { provisionTools } from './mise.js';
import { addWorktree, commitChanges, removeWorktree } from '../git/branch.js';
import { runGates } from '../gates/gate-checker.js';
import { checkEntryGates } from '../gates/entry-gates.js';
import { readNodeOutputs } from './outputs.js';
import { enterSandbox, exitSandbox, type SandboxPolicy } from './sandbox.js';

export type NodeOutputs = Record<string, string | number | boolean>;

export function resolveInputs(
  inputs: Record<string, InputValue>,
  nodeOutputs: ReadonlyMap<string, NodeOutputs>,
): NodeOutputs {
  const resolved: NodeOutputs = {};

  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'object' && value !== null && '_tag' in value && value._tag === 'outputRef') {
      const outputs = nodeOutputs.get(value.nodeId);
      if (!outputs || !(value.outputName in outputs)) {
        throw new Error(`Output "${value.outputName}" not found on node "${value.nodeId}"`);
      }
      resolved[key] = outputs[value.outputName];
    } else {
      resolved[key] = value as string | number | boolean;
    }
  }

  return resolved;
}

export interface NodeRunParams {
  readonly node: ResolvedNode;
  readonly resolvedInputs: NodeOutputs;
  readonly repoCwd: string;
  readonly runBranch: string;
  readonly agents: readonly AgentDefinition[];
  readonly sandbox: SandboxPolicy;
  readonly emit?: (event: WorkflowEvent) => void;
}

export interface NodeRunOutcome {
  readonly result: NodeResult;
  readonly outputs: NodeOutputs;
}

/**
 * The node state machine, engine-independent and idempotent:
 * ENTRY_CHECK → RUNNING → EXIT_CHECK → (retry with evidence | failed | commit).
 * The worktree is created from and discarded back to the run branch, so a
 * re-execution after a crash starts clean; the commit at the end is the
 * engine's seal that verification passed.
 */
export async function runNode(params: NodeRunParams): Promise<NodeRunOutcome> {
  const { node, resolvedInputs, repoCwd, runBranch, agents, sandbox, emit } = params;
  const startTime = Date.now();
  const def = node.definition;
  const logs: string[] = [];
  const entryGates: GateResult[] = [];

  const log = (message: string) => {
    logs.push(message);
    emit?.({ type: 'node:log', nodeId: node.id, message });
  };

  const emitGate = (g: GateResult) => {
    log(`  ${g.passed ? '+' : 'x'} ${g.gate.kind}: ${g.detail}`);
    emit?.({ type: 'node:gate', nodeId: node.id, gate: g });
  };

  const setState = (state: NodeState, message?: string) => {
    emit?.({ type: 'node:state', nodeId: node.id, state, log: message });
  };

  const finish = (
    state: NodeState,
    postGates: readonly GateResult[],
    outputs: NodeOutputs,
  ): NodeRunOutcome => ({
    result: {
      id: node.id,
      definition: def,
      state,
      branch: runBranch,
      entryGates,
      postGates,
      duration: Date.now() - startTime,
      logs,
      outputs,
    },
    outputs,
  });

  const fail = (
    reason: string,
    postGates: readonly GateResult[] = [],
    outputs: NodeOutputs = {},
  ): NodeRunOutcome => {
    log(`[failed] ${reason}`);
    setState('failed', reason);
    return finish('failed', postGates, outputs);
  };

  // === ENTRY: input validation (before any worktree exists) ===
  entryGates.push(...checkEntryGates(def.inputs, resolvedInputs));
  for (const g of entryGates) emitGate(g);
  if (entryGates.some((g) => !g.passed)) {
    return fail('Entry gates did not pass');
  }

  const maxRetries = def.kind === 'task' ? (def.retries ?? 0) : 0;
  let retryEvidence: string | undefined;

  for (let attempt = 0; ; attempt++) {
    const state: NodeState = attempt > 0 ? 'retrying' : 'executing';
    setState(state);
    log(`[${state}] ${def.kind}: ${def.name}`);

    const worktree = await addWorktree(repoCwd, runBranch, node.id);
    const worktreeCwd = worktree.worktreePath;
    log(`Created worktree: ${worktreeCwd} (branch: ${runBranch})`);

    try {
      const tools = def.permissions?.tools ?? [];
      if (tools.length > 0) {
        log(`Provisioning tools: ${tools.join(', ')}`);
        await provisionTools(tools, worktreeCwd);
      }

      // === ENTRY: declared pre-gates, run in the worktree ===
      if (def.pre?.length) {
        const preResults = await runGates(def.pre, worktreeCwd, resolvedInputs);
        entryGates.push(...preResults);
        for (const g of preResults) emitGate(g);
        if (preResults.some((g) => !g.passed && g.gate.required !== false)) {
          return fail('Pre-gates did not pass');
        }
      }

      // Enter sandbox — all child processes spawned by the effect are
      // wrapped with nono using the node's declared permissions
      await enterSandbox(def.permissions, sandbox);

      const execResult = await executeNode(
        node,
        resolvedInputs,
        agents,
        worktreeCwd,
        emit ? (message) => emit({ type: 'node:log', nodeId: node.id, message }) : undefined,
        retryEvidence,
      );
      logs.push(...execResult.logs);

      if (execResult.resolvedAgent) {
        emit?.({ type: 'node:agent', nodeId: node.id, agentName: execResult.resolvedAgent });
      }

      if (!execResult.success) {
        return fail('Execution failed');
      }

      // === EXIT: outputs from .fabster/outputs.json, schema-verified ===
      const postGates: GateResult[] = [];
      const produced = await readNodeOutputs(def, worktreeCwd);
      postGates.push(...produced.gates);
      for (const g of produced.gates) emitGate(g);

      // === EXIT: declared post-gates ===
      if (def.post?.length) {
        setState('validating');
        log(`[validating] Running ${def.post.length} post-gate(s)`);
        const postResults = await runGates(def.post, worktreeCwd, resolvedInputs);
        postGates.push(...postResults);
        for (const g of postResults) emitGate(g);
      }

      const failedGates = postGates.filter((g) => !g.passed && g.gate.required !== false);
      if (failedGates.length > 0) {
        // Retry applies to tasks only: a command is deterministic, so
        // re-running it on the same inputs cannot change the outcome.
        if (attempt < maxRetries) {
          retryEvidence = [
            `Attempt ${attempt + 1} of ${maxRetries} failed.`,
            'Post-gate failures:',
            ...failedGates.map((g) => `- ${g.gate.kind}: ${g.detail ?? 'failed'}`),
          ].join('\n');

          emit?.({
            type: 'node:retry',
            nodeId: node.id,
            attempt: attempt + 1,
            maxAttempts: maxRetries,
            evidence: retryEvidence,
          });
          continue;
        }
        return fail('Post-gates did not pass', postGates, produced.outputs);
      }

      // === COMMIT: the engine's seal that verification passed ===
      setState('publishing');
      const sha = await commitChanges(worktreeCwd, `fabster: ${def.name}\n\n${def.purpose}`);
      log(sha ? `[publishing] Committed: ${sha}` : '[publishing] No changes to commit');

      setState('complete');
      log('[complete]');
      return finish('complete', postGates, produced.outputs);
    } finally {
      exitSandbox();
      await removeWorktree(repoCwd, worktreeCwd);
    }
  }
}
