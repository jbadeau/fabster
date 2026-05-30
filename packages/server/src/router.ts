import { initTRPC } from '@trpc/server';
import { observable } from '@trpc/server/observable';
// Force TS to include the internal tRPC type in declaration emit
import type {} from '@trpc/server/unstable-core-do-not-import';
import { z } from 'zod';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import type { WorkflowDefinition, AgentDefinition } from '@fabster/core';
import {
  runWorkflow,
  createWorkflowEmitter,
  extractNodes,
} from '@fabster/runtime';
import type {
  WorkflowEvent,
  WorkflowEmitter,
  ModelMap,
  NodeState,
} from '@fabster/runtime';

const t = initTRPC.create();

const workflowEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('node:state'), nodeId: z.string(), state: z.string(), log: z.string().optional() }),
  z.object({ type: z.literal('node:log'), nodeId: z.string(), message: z.string() }),
  z.object({ type: z.literal('node:gate'), nodeId: z.string(), gate: z.object({ gate: z.object({ kind: z.string(), required: z.boolean().optional() }), passed: z.boolean(), detail: z.string().optional() }) }),
  z.object({ type: z.literal('node:mr'), nodeId: z.string(), mr: z.string() }),
  z.object({ type: z.literal('node:retry'), nodeId: z.string(), attempt: z.number(), maxAttempts: z.number(), evidence: z.string() }),
  z.object({ type: z.literal('workflow:done'), status: z.enum(['success', 'failed', 'gated']) }),
]);

export type WorkflowEventOutput = z.infer<typeof workflowEventSchema>;

interface WorkflowModule {
  default?: WorkflowDefinition;
  workflow?: WorkflowDefinition;
  agents?: readonly AgentDefinition[];
  models?: ModelMap;
}

interface ActiveRun {
  emitter: WorkflowEmitter;
  startedAt: number;
  workflowName: string;
  nodes: { id: string; name: string; kind: string; state: NodeState }[];
  status: 'running' | 'success' | 'failed' | 'gated';
  nodeLogs: Map<string, string[]>;
}

// In-memory store for active runs
const activeRuns = new Map<string, ActiveRun>();

export const appRouter = t.router({
  // List available workflows (placeholder — will scan filesystem)
  listWorkflows: t.procedure.query(() => {
    return { workflows: [] as { id: string; name: string; path: string }[] };
  }),

  // List active runs
  listRuns: t.procedure.query(() => {
    return {
      runs: [...activeRuns.entries()].map(([id, run]) => ({
        id,
        workflowName: run.workflowName,
        startedAt: run.startedAt,
        status: run.status,
        nodes: run.nodes,
      })),
    };
  }),

  // Get a single run's state
  getRun: t.procedure
    .input(z.object({ runId: z.string() }))
    .query(({ input }) => {
      const run = activeRuns.get(input.runId);
      if (!run) return null;
      return {
        id: input.runId,
        workflowName: run.workflowName,
        startedAt: run.startedAt,
        status: run.status,
        nodes: run.nodes,
      };
    }),

  // Trigger a workflow run
  runWorkflow: t.procedure
    .input(z.object({
      workflowPath: z.string(),
    }))
    .mutation(async ({ input }) => {
      const runId = `run_${Date.now()}`;
      const absolutePath = path.resolve(input.workflowPath);
      const fileUrl = pathToFileURL(absolutePath).href;

      // Dynamically import the workflow module
      const mod = (await import(fileUrl)) as WorkflowModule;

      const workflow = mod.default ?? mod.workflow;
      if (!workflow) {
        throw new Error('Workflow file must export a WorkflowDefinition as default or named "workflow"');
      }

      const agents = mod.agents ?? [];
      const models = mod.models;
      if (!models) {
        throw new Error('Workflow file must export a "models" object with { low, medium, high } LanguageModel entries');
      }

      // Extract nodes for initial state
      const nodes = extractNodes(workflow);
      const nodeStates = nodes.map((n) => ({
        id: n.id,
        name: n.definition.name,
        kind: n.definition.kind,
        state: 'pending' as NodeState,
      }));

      // Create emitter and register the run
      const emitter = createWorkflowEmitter();
      const activeRun: ActiveRun = {
        emitter,
        startedAt: Date.now(),
        workflowName: workflow.name,
        nodes: nodeStates,
        status: 'running',
        nodeLogs: new Map(),
      };
      activeRuns.set(runId, activeRun);

      // Update node states as events come in
      emitter.on('progress', (event: WorkflowEvent) => {
        if (event.type === 'node:state') {
          const node = activeRun.nodes.find((n) => n.id === event.nodeId);
          if (node) {
            node.state = event.state as NodeState;
          }
        }
        if (event.type === 'node:log') {
          const logs = activeRun.nodeLogs.get(event.nodeId);
          if (logs) {
            logs.push(event.message);
          } else {
            activeRun.nodeLogs.set(event.nodeId, [event.message]);
          }
        }
        if (event.type === 'workflow:done') {
          activeRun.status = event.status;
        }
      });

      // Fire and forget — the subscription streams events to the client
      runWorkflow(workflow, { agents, models, emitter }).catch((err) => {
        console.error(`Workflow run ${runId} error:`, err);
        activeRun.status = 'failed';
      });

      return { runId, workflowName: workflow.name, nodes: nodeStates };
    }),

  // Get logs for a specific node in a run
  getNodeLogs: t.procedure
    .input(z.object({ runId: z.string(), nodeId: z.string() }))
    .query(({ input }) => {
      const run = activeRuns.get(input.runId);
      if (!run) return { logs: [] };
      return { logs: run.nodeLogs.get(input.nodeId) ?? [] };
    }),

  // Cancel a run
  cancelRun: t.procedure
    .input(z.object({ runId: z.string() }))
    .mutation(({ input }) => {
      activeRuns.delete(input.runId);
      return { cancelled: true };
    }),

  // Subscribe to workflow events (server → client stream)
  onWorkflowEvent: t.procedure
    .input(z.object({ runId: z.string() }))
    .subscription(({ input }) => {
      return observable<WorkflowEventOutput>((emit) => {
        const run = activeRuns.get(input.runId);
        if (!run) {
          emit.error(new Error(`Run ${input.runId} not found`));
          return;
        }

        const handler = (event: WorkflowEvent) => {
          emit.next(event as WorkflowEventOutput);
          if (event.type === 'workflow:done') {
            emit.complete();
          }
        };

        run.emitter.on('progress', handler);

        return () => {
          run.emitter.off('progress', handler);
        };
      });
    }),
});

export type AppRouter = typeof appRouter;
