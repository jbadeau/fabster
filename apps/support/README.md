# @fabster/support

The support workflow (BPMN `Process_Support` + `Process_Fix`) as a Restate
service. One engine: the case is a Restate workflow keyed by ticket id; the
fix is a Fabster run invoked as a durable step.

## Layout

- `case.ts` — the case handler, engine-agnostic (`handleSupportCase`). Every
  BPMN gateway is "the model proposes, code decides"; the engine reports
  facts, the support layer interprets them.
- `service.ts` — the Restate workflow (`support-case`): durable promises for
  every wait, each raced against ticket-close; LLM steps journaled with a
  low retry budget and terminal schema failures. Plus `webex-webhook`, the
  stateless doorbell that turns webhooks into workflow signals.
- `verdicts.ts` — schema-validated verdicts via the Anthropic API
  (`messages.parse` + zod).
- `fix.ts` — the fix run: `apply-approved-fix` task (build + tests post-gates
  by default) with `delivery: mergeRequest()`, and the `support-fixer`
  claude-code agent.
- `investigate.ts` — read-only investigation via the claude CLI in the repo.
- `webex.ts` — Webex post + inbound message → event mapping.

## Running

```sh
# 1. Restate dev server (installed via mise, see mise.toml)
mise install && mise run restate

# 2. This service (support case + webex doorbell + fabrication engine + forge doorbell)
WEBEX_TOKEN=... ANTHROPIC_API_KEY=... mise run support

# 3. Register it
restate deployments register http://localhost:9080
```

Open a case (normally done by the ticket-system webhook):

```sh
curl localhost:8080/webex-webhook/open --json \
  '{"ticketId": "T-1", "roomId": "<webex room>", "request": "build fails on main"}'
```

Inbound Webex messages go to `/webex-webhook/message`, external ticket close
to `/webex-webhook/ticketClosed`.

## Interim notes

- The fix runs the local Fabster runner inside a journaled step. This is the
  migration plan's step-4 shape; step 5 moves the runner's outer walk onto
  Restate (node-per-step, keyed run state).
- `handleSupportCase` is pure and reused by `examples/support/run.ts`, which
  drives it with scripted events and a real local fix run — no Restate, no
  API keys needed.
