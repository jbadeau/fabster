import type { RunResult } from '@fabster/runtime';

export type RequesterChoice =
  | 'try-fix'
  | 'do-it-myself'
  | 'does-not-apply'
  | 'close'
  | 'still-need-help';

/** Events arriving from outside — Webex webhooks and the ticket system. */
export type SupportEvent =
  | { readonly type: 'requester-message'; readonly text: string }
  | { readonly type: 'requester-choice'; readonly choice: RequesterChoice }
  | { readonly type: 'ticket-closed' };

/** BPMN "Enough information?" gateway input. */
export interface InfoVerdict {
  readonly ready: boolean;
  readonly missing: readonly string[];
  /** Repository path or URL extracted from the conversation, when present. */
  readonly repo?: string | null;
}

/** BPMN "Useful next step?" gateway input. */
export type ApproachVerdict =
  | { readonly kind: 'code-fix'; readonly plan: string }
  | { readonly kind: 'chat-answer'; readonly answer: string }
  | { readonly kind: 'handoff'; readonly reason: string };

/**
 * BPMN Process_Fix's non-engine end states — diagnoses of a failed run,
 * produced from the run's gate evidence by the support layer.
 */
export type FixDiagnosis =
  | { readonly kind: 'guidance'; readonly guidance: string }
  | { readonly kind: 'needs-information'; readonly questions: readonly string[] }
  | { readonly kind: 'needs-developers'; readonly summary: string };

export interface SupportDeps {
  /** Post to the Webex discussion (BPMN service tasks). */
  post(message: string): Promise<void>;
  /** Wait for the next external event (BPMN user tasks / durable promises). */
  wait(): Promise<SupportEvent>;
  /** LLM seam — assess whether the request is actionable. */
  assessInformation(context: string): Promise<InfoVerdict>;
  /** Read-only agent seam — investigate repository + chat + RAG. */
  investigate(context: string): Promise<string>;
  /** LLM seam — propose the next step from the findings. */
  chooseApproach(findings: string): Promise<ApproachVerdict>;
  /** The Fabster fabrication run (BPMN callActivity ProvideFix). */
  runFix(plan: string, findings: string): Promise<RunResult>;
  /** LLM seam — interpret a failed run's evidence. */
  diagnoseFailure(run: RunResult): Promise<FixDiagnosis>;
}

export type CaseOutcome = 'resolved' | 'closed-externally' | 'handed-off';

export interface CaseResult {
  readonly outcome: CaseOutcome;
  readonly trace: readonly string[];
  readonly fixRun?: RunResult;
}
