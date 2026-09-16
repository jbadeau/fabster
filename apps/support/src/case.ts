/**
 * The support case handler — the outer BPMN process (Process_Support),
 * engine-agnostic. In production it runs inside a Restate workflow keyed by
 * ticket id (see service.ts): every `wait()` is a durable promise resolved
 * by a Webex webhook and raced against ticket-close, every verdict is a
 * schema-validated LLM call, and the fix runs as a durable step.
 *
 * The two standing rules of the architecture:
 * - Every BPMN gateway is "the model proposes, code decides": verdicts are
 *   typed values; routing is plain deterministic code.
 * - The engine reports facts (run status, MR, gate evidence). Interpreting a
 *   failed run as guidance / needs-information / needs-developers is a
 *   support-layer step (`diagnoseFailure`), never an engine state.
 */
import type { RunResult } from '@fabster/runtime';
import type { CaseResult, CaseOutcome, SupportDeps } from './types.js';

export async function handleSupportCase(
  request: string,
  deps: SupportDeps,
): Promise<CaseResult> {
  const trace: string[] = [];
  const step = (s: string) => trace.push(s);
  let fixRun: RunResult | undefined;

  const done = (outcome: CaseOutcome): CaseResult => ({ outcome, trace, fixRun });

  // === Discussion ===
  await deps.post(`Opened discussion for: ${request}`);
  step('discussion-opened');

  // === Information loop (Enough information? / Ask for missing details) ===
  let context = request;
  let info = await deps.assessInformation(context);
  while (!info.ready) {
    step('asking-for-details');
    await deps.post(`I need a bit more to proceed:\n${info.missing.map((m) => `- ${m}`).join('\n')}`);
    const event = await deps.wait();
    if (event.type === 'ticket-closed') return done('closed-externally');
    if (event.type === 'requester-message') {
      context = `${context}\n${event.text}`;
      info = await deps.assessInformation(context);
    }
  }
  step('information-complete');

  // === Prepare + Investigate (read-only) ===
  await deps.post('Investigating read-only: repository + chat history + docs. I will report back with a plan.');
  let findings = await deps.investigate(context);
  step('investigated');

  // A resolution card is posted with whatever we ended up with, then the
  // requester chooses close / still-need-help (Confirm + Satisfied?).
  const resolution = async (card: string): Promise<CaseResult> => {
    await deps.post(`${card}\n\nReply "close" to close the discussion, or "still need help".`);
    step('resolution-card-posted');
    const event = await deps.wait();
    if (event.type === 'ticket-closed') return done('closed-externally');
    if (event.type === 'requester-choice' && event.choice === 'close') {
      await deps.post('Posted resolution in the original thread. Closing the discussion.');
      step('resolved');
      return done('resolved');
    }
    // Still need help → hand off to the development team.
    return handoff('Requester still needs help after the proposed resolution.');
  };

  // === Handoff (stop agent runs; add the development team) ===
  const handoff = async (reason: string): Promise<CaseResult> => {
    await deps.post(`Handing off to the development team: ${reason}\nFindings so far:\n${findings}`);
    step('handed-off-to-developers');
    const event = await deps.wait(); // developers offer a solution
    if (event.type === 'ticket-closed') return done('closed-externally');
    if (event.type === 'requester-message') {
      return resolution(`From the development team:\n${event.text}`);
    }
    return done('handed-off');
  };

  // === Approach loop (Useful next step? — re-entered after needs-information) ===
  for (;;) {
    const approach = await deps.chooseApproach(findings);

    if (approach.kind === 'chat-answer') {
      step('chat-answer');
      return resolution(`Suggested resolution:\n${approach.answer}`);
    }

    if (approach.kind === 'handoff') {
      step('no-credible-solution');
      return handoff(approach.reason);
    }

    // === Explain the proposed fix; requester chooses (Consent) ===
    step('fix-proposed');
    await deps.post(`Proposed fix:\n${approach.plan}\n\nShall I try it? (try-fix / do-it-myself / does-not-apply)`);
    const choice = await deps.wait();
    if (choice.type === 'ticket-closed') return done('closed-externally');
    if (choice.type !== 'requester-choice') continue;

    if (choice.choice === 'do-it-myself') {
      step('requester-self-service');
      return resolution(`Here is the plan to apply yourself:\n${approach.plan}`);
    }
    if (choice.choice === 'does-not-apply') {
      step('plan-rejected');
      return handoff('Requester says the proposed fix does not apply.');
    }

    // === ProvideFix: the Fabster run (announce → effect → gates → delivery) ===
    await deps.post('Attempting the approved fix in an isolated workspace…');
    step('fix-run-started');
    fixRun = await deps.runFix(approach.plan, findings);
    step(`fix-run-${fixRun.status}`);

    if (fixRun.status === 'success' || fixRun.status === 'gated') {
      const where = fixRun.mr
        ? `Merge request: ${fixRun.mr}`
        : `Verified change is on branch fabster/${fixRun.workflow} (no remote configured, so no MR was opened).`;
      return resolution(`The fix is applied and verified.\n${where}`);
    }

    // The run failed — the engine reported facts; now interpret them.
    const diagnosis = await deps.diagnoseFailure(fixRun);
    step(`diagnosis-${diagnosis.kind}`);

    if (diagnosis.kind === 'guidance') {
      return resolution(`I could not land a verified fix, but here is what will work:\n${diagnosis.guidance}`);
    }
    if (diagnosis.kind === 'needs-developers') {
      return handoff(diagnosis.summary);
    }

    // needs-information: ask, fold the reply into context, re-investigate.
    await deps.post(`I need answers to continue:\n${diagnosis.questions.map((q) => `- ${q}`).join('\n')}`);
    const followup = await deps.wait();
    if (followup.type === 'ticket-closed') return done('closed-externally');
    if (followup.type === 'requester-message') {
      context = `${context}\n${followup.text}`;
      findings = await deps.investigate(context);
      step('re-investigated');
    }
  }
}
