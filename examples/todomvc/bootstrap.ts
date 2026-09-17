import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/**
 * Bootstrap the demo workspace with raw Nx before the workflow module
 * resolves it: create-nx-workspace scaffolds a real workspace, and the
 * workflow starts from adding plugins and generating apps. Shared between
 * run.ts (direct local run) and run-via-server.ts (triggered through
 * @fabster/server, so the run shows up live in the dashboard) — both need
 * the same repo to exist with the same git identity before runWorkflow can
 * do anything with it.
 */
export function bootstrapDemoWorkspace(repo: string): void {
  if (existsSync(repo)) return;

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
