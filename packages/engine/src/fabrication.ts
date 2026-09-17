/**
 * The fabrication run on Restate — the production engine.
 *
 * Each node executes as one journaled step (the node lifecycle is idempotent:
 * the worktree is recreated from the run branch, and the commit only lands
 * when gates pass, so a crashed step re-runs safely). Run state lives in the
 * workflow's keyed state; branches are run-scoped; the MR review is a durable
 * promise resolved by the forge's webhook — merged means success, closed
 * without merging means rejected.
 */
import * as restate from '@restatedev/restate-sdk';
import type { NodeResult, RunResult } from '@fabster/runtime';
import {
  branchExists,
  createMR,
  createRunBranch,
  ensureInitialCommit,
  extractNodes,
  resolveInputs,
  runNode,
  type NodeOutputs,
} from '@fabster/runtime';
import { loadWorkflowRef, type WorkflowRef } from './loader.js';

export const fabrication = restate.workflow({
  name: 'fabrication',
  handlers: {
    run: async (ctx: restate.WorkflowContext, ref: WorkflowRef): Promise<RunResult> => {
      // Module loading is deterministic for a given deployment — it happens
      // on every replay and never enters the journal (definitions hold
      // functions and cannot be serialized).
      const { workflow, agents } = await loadWorkflowRef(ref);
      const nodes = extractNodes(workflow);
      const repoCwd = workflow.workspace.root;
      const runBranch = `fabster/${workflow.name}/${ctx.key}`;

      await ctx.run('prepare-branch', async () => {
        await ensureInitialCommit(repoCwd);
        if (!(await branchExists(repoCwd, runBranch))) {
          await createRunBranch(repoCwd, runBranch);
        }
      });

      const results: NodeResult[] = [];
      const outputsByNode = new Map<string, NodeOutputs>();
      let failed = false;

      for (const node of nodes) {
        if (failed) {
          const skipped: NodeResult = {
            id: node.id, definition: node.definition, state: 'skipped', branch: runBranch,
            entryGates: [], postGates: [],
            duration: 0, logs: ['Skipped — previous node failed'], outputs: {},
          };
          results.push(skipped);
          ctx.set(`node-${node.id}`, skipped);
          continue;
        }

        const resolvedInputs = resolveInputs(node.inputs, outputsByNode);
        const outcome = await ctx.run(`node-${node.id}`, () =>
          // The production engine always enforces the sandbox — there is no
          // trusted-local-demo carve-out here the way examples/todomvc has.
          runNode({ node, resolvedInputs, repoCwd, runBranch, agents, sandbox: 'required' }),
        );

        results.push(outcome.result);
        outputsByNode.set(node.id, outcome.outputs);
        ctx.set(`node-${node.id}`, outcome.result);
        if (outcome.result.state === 'failed') {
          failed = true;
        }
      }

      let status: RunResult['status'] = failed ? 'failed' : 'success';
      let mr: string | undefined;

      if (!failed && workflow.delivery?.kind === 'mergeRequest') {
        mr = (await ctx.run('deliver', () =>
          createMR(repoCwd, runBranch, 'main', `[fabster] ${workflow.name}`, workflow.purpose),
        )) ?? undefined;

        if (mr && workflow.delivery.review) {
          ctx.set('mr', mr);
          const merged = await ctx.promise<boolean>('mr-resolved');
          status = merged ? 'success' : 'failed';
        }
      }

      const result: RunResult = { workflow: workflow.name, nodes: results, status, mr };
      ctx.set('result', result);
      return result;
    },

    /** Resolved by the forge webhook: true = merged, false = closed unmerged. */
    mrResolved: async (ctx: restate.WorkflowSharedContext, merged: boolean): Promise<void> => {
      const promise = ctx.promise<boolean>('mr-resolved');
      if ((await promise.peek()) === undefined) {
        await promise.resolve(merged);
      }
    },
  },
});

/**
 * The forge doorbell: MR webhooks become workflow signals. The run id is
 * carried in the MR's branch name (fabster/<workflow>/<runId>) or supplied
 * by the webhook configuration.
 */
export const forgeWebhook = restate.service({
  name: 'forge-webhook',
  handlers: {
    mrMerged: async (ctx: restate.Context, payload: { runId: string }): Promise<void> => {
      ctx.workflowSendClient(fabrication, payload.runId).mrResolved(true);
    },
    mrClosed: async (ctx: restate.Context, payload: { runId: string }): Promise<void> => {
      ctx.workflowSendClient(fabrication, payload.runId).mrResolved(false);
    },
  },
});
