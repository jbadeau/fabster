import { initTRPC } from '@trpc/server';
import { observable } from '@trpc/server/observable';
// Force TS to include the internal tRPC type in declaration emit
import type {} from '@trpc/server/unstable-core-do-not-import';
import { z } from 'zod';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { writeFile, mkdir, readdir, readFile as fsReadFile } from 'node:fs/promises';
import type { WorkflowDefinition, AgentDefinition } from '@fabster/core';
import {
  runWorkflow,
  createWorkflowEmitter,
  extractNodes,
} from '@fabster/runtime';
import { loadCatalog } from './catalog.js';
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
  z.object({ type: z.literal('node:agent'), nodeId: z.string(), agentName: z.string() }),
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

interface SerializedNode {
  id: string;
  name: string;
  kind: string;
  purpose: string;
  state: NodeState;
  agent?: string;
  inputs?: { name: string; kind: string; description?: string; value?: string | number | boolean }[];
  outputs?: { name: string; kind: string; description?: string }[];
  steps?: string[];
  requirements?: string[];
  instructions?: string[];
  rules?: string[];
  reasoning?: string;
  permissions?: { fs?: { read?: string[]; write?: string[] }; tools?: string[]; network?: string[]; secrets?: string[] };
  gates?: string[];
}

interface ActiveRun {
  emitter: WorkflowEmitter;
  startedAt: number;
  workflowName: string;
  nodes: SerializedNode[];
  edges: { id: string; source: string; target: string }[];
  status: 'running' | 'success' | 'failed' | 'gated';
  nodeLogs: Map<string, string[]>;
}

// In-memory store for active runs
const activeRuns = new Map<string, ActiveRun>();

interface PersistedRun {
  id: string;
  workflowName: string;
  startedAt: number;
  status: string;
  nodes: SerializedNode[];
  edges: { id: string; source: string; target: string }[];
  nodeLogs: Record<string, string[]>;
}

async function persistRun(runId: string, run: ActiveRun): Promise<void> {
  const dir = path.join(process.cwd(), '.fabster', 'runs');
  await mkdir(dir, { recursive: true });
  const data: PersistedRun = {
    id: runId,
    workflowName: run.workflowName,
    startedAt: run.startedAt,
    status: run.status,
    nodes: run.nodes,
    edges: run.edges,
    nodeLogs: Object.fromEntries(run.nodeLogs),
  };
  await writeFile(path.join(dir, `${runId}.json`), JSON.stringify(data, null, 2));
}

async function loadPersistedRuns(): Promise<void> {
  const dir = path.join(process.cwd(), '.fabster', 'runs');
  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await fsReadFile(path.join(dir, file), 'utf-8');
        const data = JSON.parse(content) as PersistedRun;
        // Don't load runs that are still "running" — they can't resume
        const status = data.status === 'running' ? 'failed' : data.status;
        const emitter = createWorkflowEmitter();
        activeRuns.set(data.id, {
          emitter,
          startedAt: data.startedAt,
          workflowName: data.workflowName,
          nodes: data.nodes,
          edges: data.edges,
          status: status as ActiveRun['status'],
          nodeLogs: new Map(Object.entries(data.nodeLogs)),
        });
      } catch {
        // Skip corrupt files
      }
    }
  } catch {
    // No runs directory yet
  }
}

// Load persisted runs on startup
loadPersistedRuns().catch(() => {});

export const appRouter = t.router({
  // List available workflows by scanning known directories
  listWorkflows: t.procedure.query(async () => {
    const { readdir } = await import('node:fs/promises');
    const { existsSync } = await import('node:fs');

    const dirs = ['examples', 'workflows'];
    const workflows: { id: string; name: string; path: string }[] = [];

    for (const dir of dirs) {
      if (!existsSync(dir)) continue;
      const entries = (await readdir(dir, { recursive: true })) as string[];
      for (const entry of entries) {
        if (entry.endsWith('/workflow.ts') || entry === 'workflow.ts') {
          const filePath = path.join(dir, entry);
          workflows.push({
            id: filePath,
            name: path.dirname(filePath).split('/').pop() ?? filePath,
            path: filePath,
          });
        }
      }
    }

    return { workflows };
  }),

  // List tasks discovered from installed @fabster plugin packages
  listTasks: t.procedure.query(async () => {
    const { tasks } = await loadCatalog();
    return { tasks };
  }),

  // List commands discovered from installed @fabster plugin packages
  listCommands: t.procedure.query(async () => {
    const { commands } = await loadCatalog();
    return { commands };
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
        edges: run.edges,
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
        edges: run.edges,
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
      const edges: { id: string; source: string; target: string }[] = [];
      for (const n of nodes) {
        for (const dep of n.dependsOn) {
          edges.push({ id: `e-${dep}-${n.id}`, source: dep, target: n.id });
        }
      }
      const nodeStates: SerializedNode[] = nodes.map((n) => {
        const def = n.definition;
        const inputs = def.inputs
          ? Object.entries(def.inputs).map(([name, desc]) => ({
              name,
              kind: (desc as { kind: string }).kind,
              description: (desc as { description?: string }).description,
              // Resolve input values from the workflow graph
              value: n.inputs[name] != null && typeof n.inputs[name] !== 'object'
                ? n.inputs[name] as string | number | boolean
                : undefined,
            }))
          : undefined;
        const outputs = def.outputs
          ? Object.entries(def.outputs).map(([name, desc]) => ({
              name,
              kind: (desc as { kind: string }).kind,
              description: (desc as { description?: string }).description,
            }))
          : undefined;

        const base: SerializedNode = {
          id: n.id,
          name: def.name,
          kind: def.kind,
          purpose: def.purpose,
          state: 'pending' as NodeState,
          inputs,
          outputs,
          permissions: def.permissions ? {
            fs: def.permissions.fs ? { read: [...(def.permissions.fs.read ?? [])], write: [...(def.permissions.fs.write ?? [])] } : undefined,
            tools: def.permissions.tools ? [...def.permissions.tools] : undefined,
            network: def.permissions.network ? [...def.permissions.network] : undefined,
            secrets: def.permissions.secrets ? [...def.permissions.secrets] : undefined,
          } : undefined,
          gates: def.gates?.map((g) => g.kind),
        };

        if (def.kind === 'command') {
          base.steps = def.steps.map((s) => s.script);
        }
        if (def.kind === 'task') {
          base.reasoning = def.reasoning;
          base.requirements = def.requirements.map((r) => `${r.namespace}: ${JSON.stringify(r.filter)}`);
          base.instructions = def.instructions ? [...def.instructions] : undefined;
          base.rules = def.rules ? [...def.rules] : undefined;
        }

        return base;
      });

      // Create emitter and register the run
      const emitter = createWorkflowEmitter();
      const activeRun: ActiveRun = {
        emitter,
        startedAt: Date.now(),
        workflowName: workflow.name,
        nodes: nodeStates,
        edges,
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
          if (event.state === 'complete' || event.state === 'failed') {
            persistRun(runId, activeRun).catch(() => {});
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
        if (event.type === 'node:agent') {
          const node = activeRun.nodes.find((n) => n.id === event.nodeId);
          if (node) {
            node.agent = event.agentName;
          }
        }
        if (event.type === 'workflow:done') {
          activeRun.status = event.status;
          persistRun(runId, activeRun).catch(() => {});
        }
      });

      // Fire and forget — the subscription streams events to the client
      runWorkflow(workflow, { agents, models, emitter }).catch((err) => {
        console.error(`Workflow run ${runId} error:`, err);
        activeRun.status = 'failed';
      });

      return { runId, workflowName: workflow.name, nodes: nodeStates, edges };
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
