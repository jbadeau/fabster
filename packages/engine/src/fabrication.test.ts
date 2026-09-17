import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

// The test workflow file below lives outside the workspace (a real OS
// tmpdir, to stand in for wherever a durable engine's workflow modules
// actually live), so a bare "@fabster/core" import in it would fail —
// Node's resolution walks up from *that* file's location, not this one.
// Resolve the real installed path once, from a location that DOES sit
// inside the workspace, and give the fixture an absolute import instead.
const CORE_ENTRY = pathToFileURL(createRequire(import.meta.url).resolve('@fabster/core')).href;

// fabrication.ts calls restate.workflow({...})/restate.service({...}) at
// module load time; neither has ever run against a real Restate server in
// this repo (packages/engine had zero tests before this file). Mocking the
// SDK factories as identity functions exposes the real handlers for direct
// invocation — this tests fabrication.ts's actual logic (the node loop,
// skip-on-failure propagation, delivery gating), not Restate's durability,
// which is the SDK's concern, not this package's.
vi.mock('@restatedev/restate-sdk', () => ({
  workflow: (config: unknown) => config,
  service: (config: unknown) => config,
}));

interface FakeCtx {
  key: string;
  run<T>(name: string, fn: () => Promise<T>): Promise<T>;
  set(key: string, value: unknown): void;
}

function fakeCtx(key: string): FakeCtx {
  return {
    key,
    run: async (_name, fn) => fn(),
    set: () => {},
  };
}

describe('fabrication.run', () => {
  it('skips every remaining node once one fails, and never delivers', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-fabrication-'));
    const workflowFile = join(cwd, 'workflow.ts');
    try {
      execFileSync('git', ['init', '-q'], { cwd });
      execFileSync('git', ['config', 'user.email', 't@t.com'], { cwd });
      execFileSync('git', ['config', 'user.name', 'test'], { cwd });

      // A two-node workflow: the first node's command always fails (exit 1),
      // the second would trivially succeed (`true`) if it ever ran.
      await writeFile(
        workflowFile,
        `
import { workflow, workspace, command, run, mergeRequest } from '${CORE_ENTRY}';

const failing = command({
  name: 'failing',
  purpose: 'always fails',
  steps: [run('exit 1')],
  inputs: {},
});

const wouldSucceed = command({
  name: 'would-succeed',
  purpose: 'never actually runs',
  steps: [run('true')],
  inputs: {},
});

export default workflow({
  name: 'two-node',
  purpose: 'test fixture',
  workspace: workspace(${JSON.stringify(cwd)}),
  delivery: mergeRequest(),
  graph: (ctx) => {
    const first = ctx.run('first', failing, {});
    ctx.run('second', wouldSucceed, {}, { dependsOn: [first] });
  },
});
export const agents = [];
`,
      );

      const { fabrication } = await import('./fabrication.js');
      const run = (fabrication as unknown as {
        handlers: { run: (ctx: FakeCtx, ref: unknown) => Promise<{ status: string; nodes: { id: string; state: string }[]; mr?: string }> };
      }).handlers.run;

      const result = await run(fakeCtx('test-run-1'), { module: workflowFile, sandbox: 'disabled' });

      expect(result.status).toBe('failed');
      expect(result.mr).toBeUndefined();
      const byId = Object.fromEntries(result.nodes.map((n) => [n.id, n.state]));
      expect(byId['first']).toBe('failed');
      expect(byId['second']).toBe('skipped');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }, 20000);
});
