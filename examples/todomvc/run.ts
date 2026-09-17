import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

// Bootstrap the demo workspace with raw Nx before the workflow module
// resolves it: create-nx-workspace scaffolds a real workspace, and the
// workflow starts from adding plugins and generating apps.
const repo = process.env['FABSTER_DEMO_REPO'] ?? '/tmp/fabster-todomvc-demo';
if (!existsSync(repo)) {
  const parent = dirname(repo);
  mkdirSync(parent, { recursive: true });
  execFileSync(
    'npx',
    [
      '--yes',
      'create-nx-workspace@latest',
      basename(repo),
      '--preset=ts',
      '--nxCloud=skip',
      '--no-interactive',
      '--packageManager=npm',
    ],
    {
      cwd: parent,
      stdio: 'inherit',
      // The demo must not depend on any user-level registry configuration.
      env: { ...process.env, npm_config_registry: 'https://registry.npmjs.org/' },
    },
  );
  const git = (...args: string[]) => execFileSync('git', args, { cwd: repo });
  writeFileSync(join(repo, '.npmrc'), 'registry=https://registry.npmjs.org/\n');
  git('config', 'user.email', 'demo@example.com');
  git('config', 'user.name', 'Fabster Demo');
  git('add', '-A');
  git('commit', '-m', 'seed: pin public npm registry');
  console.log(`Bootstrapped demo workspace: ${repo}\n`);
}

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
