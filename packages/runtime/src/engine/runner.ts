import type { WorkflowDefinition } from '@fabster/core';
import type { NodeResult, NodeState, RunOptions, RunResult, WorkflowEvent } from '../types.js';
import { extractNodes } from './graph.js';
import { resolveInputs, runNode, type NodeOutputs } from './node-lifecycle.js';
import {
  branchExists,
  createRunBranch,
  ensureInitialCommit,
} from '../git/branch.js';
import { createMR } from '../git/mr.js';
import { checkDeliveryReview } from '../gates/gate-checker.js';

/**
 * The local, in-process runner — the dev-mode convenience. Production runs
 * execute the same node lifecycle on Restate via @fabster/engine, where run
 * state lives in keyed state and the MR review is a durable promise.
 */
export async function runWorkflow(
  workflow: WorkflowDefinition,
  options: RunOptions,
): Promise<RunResult> {
  const nodes = extractNodes(workflow);
  const repoCwd = workflow.workspace.root;
  const runBranch = `fabster/${workflow.name}`;
  const emit = options.emitter
    ? (data: WorkflowEvent) => { options.emitter!.emit('progress', data); }
    : undefined;

  // Dry run
  if (options.dryRun) {
    const result: RunResult = {
      workflow: workflow.name,
      nodes: nodes.map((n) => ({
        id: n.id,
        definition: n.definition,
        state: 'pending' as NodeState,
        branch: runBranch,
        entryGates: [],
        postGates: [],
        duration: 0,
        logs: [`[dry-run] Would execute ${n.definition.kind}: ${n.definition.name}`],
        outputs: {},
      })),
      status: 'success',
    };
    emit?.({ type: 'workflow:done', status: 'success' });
    return result;
  }

  await ensureInitialCommit(repoCwd);

  const results: NodeResult[] = [];
  const nodeOutputs = new Map<string, NodeOutputs>();
  let failed = false;

  const skip = (nodeId: string, definition: NodeResult['definition'], message: string): NodeResult => {
    emit?.({ type: 'node:state', nodeId, state: 'skipped', log: message });
    return {
      id: nodeId, definition, state: 'skipped', branch: runBranch,
      entryGates: [], postGates: [],
      duration: 0, logs: [message], outputs: {},
    };
  };

  // Local runs do not resume — the branch is a write-only output of one run
  if (await branchExists(repoCwd, runBranch)) {
    const message = `Run branch ${runBranch} already exists — delete it (git branch -D ${runBranch}) or rename the workflow`;
    const skipped = nodes.map((n) => skip(n.id, n.definition, message));
    emit?.({ type: 'workflow:done', status: 'failed' });
    return { workflow: workflow.name, nodes: skipped, status: 'failed' };
  }

  await createRunBranch(repoCwd, runBranch);

  // Sequential execution in topological order — stop on first failure
  for (const node of nodes) {
    if (failed) {
      results.push(skip(node.id, node.definition, 'Skipped — previous node failed'));
      continue;
    }

    try {
      const resolvedInputs = resolveInputs(node.inputs, nodeOutputs);
      const outcome = await runNode({
        node, resolvedInputs, repoCwd, runBranch,
        agents: options.agents, emit,
      });
      results.push(outcome.result);
      nodeOutputs.set(node.id, outcome.outputs);
      if (outcome.result.state === 'failed') {
        failed = true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      emit?.({ type: 'node:state', nodeId: node.id, state: 'failed', log: message });
      results.push({
        id: node.id, definition: node.definition, state: 'failed', branch: runBranch,
        entryGates: [], postGates: [],
        duration: 0, logs: [`ERROR: ${message}`], outputs: {},
      });
      failed = true;
    }
  }

  let status: RunResult['status'] = failed ? 'failed' : 'success';
  let mr: string | undefined;

  // === DELIVERY: engine-owned, after the last node — one MR per run ===
  if (status === 'success' && workflow.delivery?.kind === 'mergeRequest') {
    try {
      mr = (await createMR(
        repoCwd, runBranch, 'main',
        `[fabster] ${workflow.name}`, workflow.purpose,
      )) ?? undefined;
      if (mr) {
        emit?.({ type: 'workflow:mr', mr });
        if (workflow.delivery.review) {
          const review = await checkDeliveryReview(repoCwd, mr);
          if (!review.passed) {
            status = 'gated';
          }
        }
      }
    } catch {
      // No remote or gh unavailable — the run branch remains as the output
    }
  }

  emit?.({ type: 'workflow:done', status });

  return { workflow: workflow.name, nodes: results, status, mr };
}
