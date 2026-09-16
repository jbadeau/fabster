# Support workflow example

The support-handling BPMN (`Process_Support` + `Process_Fix`) mapped onto the
Fabster architecture. Runs end-to-end with no API access:

```sh
npx tsx examples/support/run.ts
```

It creates a scratch git repository with a known bug, drives the support case
through the BPMN's happy path, and executes a **real** Fabster run for the fix
— worktree isolation, the `.fabster/outputs.json` outputs contract, a custom
`check` gate, and the engine's commit on the run branch. `main` stays buggy;
the verified fix lives on `fabster/support-fix-T-1042`, exactly as the
publish-after-verification model prescribes.

## BPMN → architecture mapping

| BPMN element | Where it lives | In this example |
|---|---|---|
| `Process_Support` (the pool) | Restate workflow keyed by ticket id (`apps/support`) | `handleSupportCase` from `@fabster/support`, driven by scripted events |
| User tasks (ask details, choose, confirm) | Durable promises resolved by Webex webhooks, raced against ticket-close | `deps.wait()` — scripted event queue |
| Service tasks (open discussion, resolution card) | Journaled steps calling Webex | `deps.post()` — console |
| Gateways (enough info? next step? choice?) | Model proposes a typed verdict, deterministic code routes | `assessInformation` / `chooseApproach` stubs returning typed verdicts |
| `Investigate read-only` | Read-only agent producing findings; context continuity, not workspace continuity | `deps.investigate()` stub |
| `callActivity ProvideFix` → `Process_Fix` | A Fabster run invoked as a durable call (`@fabster/engine`) | `supportFixWorkflow` from `@fabster/support` + real local `runWorkflow` |
| `ApplyValidate` → `Attempt result?` | Task effect → post-gates | `apply-fix` task, `gate('tests-pass', { check: 'sh test.sh' })` |
| `PublishMR` (+ error boundary) | Engine-owned delivery: `delivery: mergeRequest()` | Skipped gracefully (scratch repo has no remote) |
| `MR_READY` / `BLOCKED` | Engine facts: run status + `mr` | `fixRun.status`, `fixRun.mr` |
| `GUIDANCE` / `NEEDS_INFORMATION` / `NEEDS_DEVELOPERS` | Support-layer diagnosis of a failed run's gate evidence — never engine states | `deps.diagnoseFailure()` |
| `Handoff — stop agent writes` | Nothing to revoke: agents only write in throwaway worktrees; handoff = post findings, start no more runs | `handoff()` in the case handler |

## What is stubbed vs real

**Real:** the entire fix run — Fabster runner, worktree, external-agent effect
(a scripted subprocess standing in for `claudeCodeAgent`), entry gates,
outputs verification, the custom check gate, the engine's seal commit.

**Stubbed here, implemented for real in `apps/support`:** `wait()` is a
Restate durable promise fed by Webex webhooks and raced against ticket-close;
the three verdict functions are schema-validated LLM calls (low retry budget,
schema failures terminal); `post()` is the Webex API via `@fabster/webex`;
and the fix runs on the durable engine as a cross-workflow call. This example
drives the same `handleSupportCase` with scripts so it runs with no keys and
no infrastructure.
