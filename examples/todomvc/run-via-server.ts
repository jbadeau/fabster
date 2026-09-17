/**
 * Runs the TodoMVC workflow through @fabster/server instead of calling
 * runWorkflow directly — the same way run.ts does — so the run is tracked
 * by the server's in-memory run registry and streams live per-node
 * progress exactly like every other workflow the dashboard shows. Every
 * other example bypasses the server entirely, which means the dashboard
 * — a fully built product surface — has nothing to actually display.
 *
 * Usage:
 *   npx tsx examples/todomvc/run-via-server.ts
 * Then open http://localhost:3456 to watch it live, or let this script's
 * own polling loop print progress to the terminal.
 */
import { fileURLToPath } from 'node:url';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@fabster/server';
import { bootstrapDemoWorkspace } from './bootstrap.ts';

const repo = process.env['FABSTER_DEMO_REPO'] ?? '/tmp/fabster-todomvc-demo';
bootstrapDemoWorkspace(repo);

const { startServer } = await import('@fabster/server');
const port = Number(process.env['FABSTER_SERVER_PORT'] ?? 3456);
startServer({ port });
console.log(`Dashboard: http://localhost:${port}`);

const client = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `http://localhost:${port}/trpc` })],
});

// The server's runWorkflow procedure resolves the module path itself, the
// same way run.ts's own dynamic import does — pass the workflow file, not
// a loaded definition (definitions hold functions and can't cross tRPC).
//
// Unlike run.ts, this does NOT pass sandbox: 'disabled' — the server stays
// safe-by-default for any workflow it's asked to run. That means this run
// will fail at write-openapi-spec: the claude CLI's own ~/.claude.json
// project-history scan doesn't yet compose with nono sandboxing (see the
// comment in run.ts). That failure is expected and demonstrates the
// dashboard/server wiring correctly, not a regression in it.
const workflowPath = fileURLToPath(new URL('./workflow.ts', import.meta.url));
const started = await client.runWorkflow.mutate({ workflowPath });
console.log(`Run ${started.runId} started — ${started.nodes.length} node(s)\n`);

// Poll rather than subscribe over the raw ws link here — this script is
// a CLI progress readout, not the dashboard itself, which is what the
// subscription-driven live view is for.
const lastPrinted = new Map<string, string>();
for (;;) {
  await new Promise((r) => setTimeout(r, 2000));
  const run = await client.getRun.query({ runId: started.runId });
  if (!run) throw new Error(`Run ${started.runId} disappeared from the server's registry`);

  for (const node of run.nodes) {
    if (lastPrinted.get(node.id) !== node.state) {
      lastPrinted.set(node.id, node.state);
      console.log(`  ${node.id}: ${node.state}`);
    }
  }

  if (run.status !== 'running') {
    console.log(`\nWorkflow "${run.workflowName}" ${run.status}`);
    process.exit(run.status === 'success' ? 0 : 1);
  }
}
