import { initTRPC } from '@trpc/server';
import { observable } from '@trpc/server/observable';
// Force TS to include the internal tRPC type in declaration emit
import type {} from '@trpc/server/unstable-core-do-not-import';
import { z } from 'zod';
import type { WorkflowEvent, WorkflowEmitter } from '@fabster/runtime';

const t = initTRPC.create();

const workflowEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('node:state'), nodeId: z.string(), state: z.string(), log: z.string().optional() }),
  z.object({ type: z.literal('node:log'), nodeId: z.string(), message: z.string() }),
  z.object({ type: z.literal('node:gate'), nodeId: z.string(), gate: z.object({ gate: z.object({ kind: z.string(), required: z.boolean().optional() }), passed: z.boolean(), detail: z.string().optional() }) }),
  z.object({ type: z.literal('node:mr'), nodeId: z.string(), mr: z.string() }),
  z.object({ type: z.literal('workflow:done'), status: z.enum(['success', 'failed', 'gated']) }),
]);

export type WorkflowEventOutput = z.infer<typeof workflowEventSchema>;

// In-memory store for active runs
const activeRuns = new Map<string, { emitter: WorkflowEmitter; startedAt: number }>();

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
        startedAt: run.startedAt,
      })),
    };
  }),

  // Trigger a workflow run
  runWorkflow: t.procedure
    .input(z.object({
      workflowPath: z.string(),
    }))
    .mutation(async ({ input }) => {
      const runId = `run_${Date.now()}`;
      // Workflow loading will be handled when we wire up the daemon
      return { runId, status: 'started' as const };
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
