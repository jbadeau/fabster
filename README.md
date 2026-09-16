# Fabster

**A workflow is a graph of externally verified effects.**

Fabster is a verification-first workflow engine for work that mixes
deterministic automation with AI agents. Agent harnesses are treated as
untrusted, pluggable workers: an agent's claim that it succeeded is logged
and ignored. The only thing that advances a workflow is deterministic
verification — builds, tests, schema checks, custom check scripts — and the
only thing that ships the result is a human-reviewed merge request.

## The node contract

Every node in a workflow is the same guarded transition:

```
pre-gates (deterministic) → effect → post-gates (deterministic) → commit (engine)
```

- A **command** is a deterministic effect — shell steps whose exit code is
  itself a verification.
- A **task** is a probabilistic effect — an agent working in an isolated git
  worktree, invoked as a black-box subprocess.

Two rules make the difference explicit:

1. **Self-report is advisory.** A task's exit code and final message never
   decide node success — only post-gates do. The DSL enforces this: a task
   without post-gates is rejected at definition time.
2. **Retry only what can differ.** On post-gate failure, tasks retry with the
   gate evidence fed back to the agent, up to a declared budget. Commands
   never retry — same input, same output.

Effects never publish. Committing onto the run branch, pushing, and opening
the merge request are engine-owned side effects that happen only after
verification passes — effect processes hold no forge credentials at all.
Outputs are a contract too: an effect writes `.fabster/outputs.json`, and
every declared output is schema-verified as a post-gate.

## The DSL

```ts
import {
  command, gate, mergeRequest, require, run, string,
  successfulBuild, task, testsPass, workflow, workspace,
} from '@fabster/core';

const scaffold = command({
  name: 'generate-api-lib',
  purpose: 'Scaffold the API library',
  steps: [run('npx nx g @nx/js:library {name}')],
  inputs: { name: string() },
});

const implement = task({
  name: 'implement-endpoints',
  purpose: 'Implement the REST endpoints described in the spec',
  requirements: [require('agent.skill', { name: 'code-generation' })],
  inputs: { spec: string() },
  outputs: { summary: string('What was implemented') },
  retries: 1,
  post: [successfulBuild(), testsPass(), gate('openapi-lint', {
    check: 'npx @redocly/cli lint {spec}',
  })],
});

export default workflow({
  name: 'build-api',
  purpose: 'Scaffold and implement the API',
  workspace: workspace('/path/to/repo'),
  delivery: mergeRequest(),          // one reviewed MR per run
  graph: (ctx) => {
    const lib = ctx.run('scaffold', scaffold, { name: 'api' });
    ctx.run('implement', implement, { spec: 'openapi.yaml' }, { dependsOn: [lib] });
  },
});
```

Agents are external harnesses matched to tasks by capability — the built-in
adapter runs the `claude` CLI, and any CLI-invokable harness plugs in the
same way:

```ts
import { claudeCodeAgent, provide } from '@fabster/core';

export const agents = [
  claudeCodeAgent('developer', {
    role: 'Full-stack developer',
    goal: 'Implement features that build on the first try',
    backstory: '…',
    capabilities: [provide('agent.skill', { name: 'code-generation' })],
  }),
];
```

## Execution

**Local (dev):** `runWorkflow` from `@fabster/runtime` walks the graph in
process. Each node gets a fresh worktree on the run branch
(`fabster/<workflow>`); each verified node becomes one commit; the run ends
with one merge request. `main` never changes until a human merges.

**Durable (production):** the same node lifecycle runs on
[Restate](https://restate.dev) — a single self-contained binary — via
`@fabster/engine`. Each node is a journaled step (crash-safe, exactly-once
side effects), run state lives in the workflow's keyed state, branches are
run-scoped, and the MR review is a durable promise resolved by the forge's
merge webhook. No database, no worker cluster.

Event-driven flows build on the same engine: `apps/support` is a complete
example — a support-triage workflow (Webex conversation → investigation →
approved fix → fabrication run → reviewed MR) where every human wait is a
durable promise raced against ticket-close, and the two LLM decision points
produce schema-validated verdicts that deterministic code routes on.

## Repository layout

| Path | What it is |
|---|---|
| `packages/core` | The DSL and types — substrate-free, no git or engine coupling |
| `packages/runtime` | Node lifecycle, gates, effects, git publishing, local runner |
| `packages/engine` | The durable engine: fabrication runs on Restate |
| `packages/server` / `packages/cli` | tRPC server + CLI / TUI |
| `apps/dashboard` | React dashboard for runs and the catalog |
| `apps/support` | The support workflow service — a full consumer application |
| `plugins/nx`, `plugins/openapi` | Reusable commands, tasks, and agents |
| `plugins/webex` | Generic chat adapter (Webex) |
| `examples/` | Runnable examples |

Placement rule: `packages/` is the framework, `plugins/` are generic
building blocks any workflow can compose, `apps/` are deployables with a
`main()` — and code specific to one workflow lives with that workflow, not
in a plugin.

## Quick start

```sh
npm install
npx nx run-many -t build,test

# End-to-end demo — no API keys, no infrastructure:
npx tsx examples/support/run.ts
```

The demo creates a scratch repository with a known bug, drives a support
case through triage, runs a real fabrication (worktree, outputs contract,
custom check gate, engine seal commit), and shows the verified fix sitting
on the run branch while `main` stays untouched.

## Status

Experimental. The node contract, DSL, local runner, and Restate engine are
functional; interfaces will still move. Not yet published to npm — consume
via the workspace.

## License

[MIT](LICENSE)
