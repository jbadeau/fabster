import { bootstrapDemoWorkspace } from './bootstrap.ts';

const repo = process.env['FABSTER_DEMO_REPO'] ?? '/tmp/fabster-todomvc-demo';
bootstrapDemoWorkspace(repo);

const { runWorkflow } = await import('@fabster/runtime');
const { default: workflow, agents } = await import('./workflow.ts');

// This demo has no untrusted input — an explicit, deliberate opt-out, not
// the default for real workflows. Verified directly against real nono
// enforcement: every command node (npm/nx/openapi-generator) runs cleanly
// under 'required' once the engine grants its own tooling infrastructure
// (mise, npm, nx's socket IPC — see nono.ts). The remaining task nodes
// (claude-code agents) do not yet: the `claude` CLI itself scans across
// previously-used project directories from ~/.claude.json as part of its
// own startup, which doesn't compose with fine-grained sandboxing without
// further work (most likely an isolated CLAUDE_CONFIG_DIR per run, not a
// broader filesystem grant) — a real, open item, not a resolved one.
const result = await runWorkflow(workflow, { agents, sandbox: 'disabled' });

console.log(`\nWorkflow "${result.workflow}" ${result.status}`);
if (result.mr) console.log(`  MR: ${result.mr}`);
for (const node of result.nodes) {
  const icon = node.state === 'complete' ? '+' : node.state === 'failed' ? 'x' : '-';
  console.log(`  ${icon} ${node.id} [${node.state}] (${Math.round(node.duration / 1000)}s)`);
  if (node.state === 'failed') {
    for (const log of node.logs) console.log(`      ${log}`);
  }
}
process.exit(result.status === 'success' ? 0 : 1);
