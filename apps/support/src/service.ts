/**
 * The support case as a Restate workflow, keyed by ticket id.
 *
 * - Every wait is a durable promise, raced against the ticket-close promise.
 * - LLM verdicts run as journaled steps with a low retry budget; schema
 *   failures are terminal (retrying the same bad prompt burns budget).
 * - The fix is a durable call into the fabrication workflow
 *   (@fabster/engine): node-per-journaled-step, run state in keyed state,
 *   MR review as a durable promise resolved by the forge webhook.
 */
import * as restate from '@restatedev/restate-sdk';
import type { RunResult } from '@fabster/runtime';
import { fabrication } from '@fabster/engine';
import { handleSupportCase } from './case.js';
import { investigateRepo } from './investigate.js';
import { webexChat } from '@fabster/webex';
import { anthropicVerdicts, VerdictSchemaError } from './verdicts.js';
import { toSupportEvent } from './events.js';
import type { CaseResult, SupportEvent } from './types.js';

export interface OpenCaseRequest {
  readonly request: string;
  readonly roomId: string;
}

const LLM_STEP = { maxRetryAttempts: 2 } as const;

/** Schema failures must not be retried — same prompt, same bad output. */
function terminalOnSchemaError<T>(action: () => Promise<T>): () => Promise<T> {
  return async () => {
    try {
      return await action();
    } catch (error) {
      if (error instanceof VerdictSchemaError) {
        throw new restate.TerminalError(error.message);
      }
      throw error;
    }
  };
}

export const supportCase = restate.workflow({
  name: 'support-case',
  handlers: {
    run: async (ctx: restate.WorkflowContext, req: OpenCaseRequest): Promise<CaseResult> => {
      const chat = webexChat(process.env['WEBEX_TOKEN'] ?? '');
      const verdicts = anthropicVerdicts();
      const ticketId = ctx.key;

      let eventIndex = 0;
      let repo = process.env['SUPPORT_REPO'] ?? '';

      const closed: SupportEvent = { type: 'ticket-closed' };

      return handleSupportCase(req.request, {
        post: (message) =>
          ctx.run('webex-post', () => chat.post(req.roomId, message)) as Promise<void>,

        wait: async () => {
          const slot = eventIndex++;
          const winner = await restate.RestatePromise.race([
            ctx.promise<SupportEvent>(`evt-${slot}`).get(),
            ctx.promise<boolean>('closed').get(),
          ]);
          return winner === true ? closed : (winner as SupportEvent);
        },

        assessInformation: async (context) => {
          const verdict = await ctx.run(
            'assess-information',
            terminalOnSchemaError(() => verdicts.assessInformation(context)),
            LLM_STEP,
          );
          if (verdict.repo) {
            repo = verdict.repo;
            ctx.set('repo', repo);
          }
          // The checklist decides: without a repository there is nothing to
          // investigate, whatever the model proposed.
          if (verdict.ready && !repo) {
            return { ready: false, missing: ['repository path or URL'], repo: null };
          }
          return verdict;
        },

        investigate: (context) =>
          ctx.run('investigate', () => investigateRepo(repo, context), LLM_STEP),

        chooseApproach: (findings) =>
          ctx.run(
            'choose-approach',
            terminalOnSchemaError(() => verdicts.chooseApproach(findings)),
            LLM_STEP,
          ),

        runFix: (plan, findings): Promise<RunResult> =>
          // A durable call into the fabrication engine — same Restate
          // instance, so the support case suspends until the run (and its
          // MR review) resolves.
          ctx.workflowClient(fabrication, `fix-${ticketId}`).run({
            module: '@fabster/support',
            workflowExport: 'supportFixWorkflow',
            agentsExport: 'supportFixAgents',
            args: { repo, ticketId, plan, findings },
          }),

        diagnoseFailure: (run) =>
          ctx.run(
            'diagnose-failure',
            terminalOnSchemaError(() => verdicts.diagnoseFailure(run)),
            LLM_STEP,
          ),
      });
    },

    /** Inbound Webex message or choice. Fills the next unresolved event slot. */
    event: async (ctx: restate.WorkflowSharedContext, event: SupportEvent): Promise<void> => {
      for (let slot = 0; slot < 1000; slot++) {
        const promise = ctx.promise<SupportEvent>(`evt-${slot}`);
        if ((await promise.peek()) === undefined) {
          await promise.resolve(event);
          return;
        }
      }
      throw new restate.TerminalError('Case has exceeded 1000 events');
    },

    /** External close — terminates the case wherever it currently waits. */
    closed: async (ctx: restate.WorkflowSharedContext): Promise<void> => {
      const promise = ctx.promise<boolean>('closed');
      if ((await promise.peek()) === undefined) {
        await promise.resolve(true);
      }
    },
  },
});

/**
 * The doorbell: converts Webex / ticket-system webhooks into workflow
 * signals. Holds no state and no workflow logic.
 */
export const webexWebhook = restate.service({
  name: 'webex-webhook',
  handlers: {
    open: async (
      ctx: restate.Context,
      payload: { ticketId: string; roomId: string; request: string },
    ): Promise<void> => {
      ctx
        .workflowSendClient(supportCase, payload.ticketId)
        .run({ request: payload.request, roomId: payload.roomId });
    },

    message: async (
      ctx: restate.Context,
      payload: { ticketId: string; text: string },
    ): Promise<void> => {
      ctx.workflowSendClient(supportCase, payload.ticketId).event(toSupportEvent(payload.text));
    },

    ticketClosed: async (
      ctx: restate.Context,
      payload: { ticketId: string },
    ): Promise<void> => {
      ctx.workflowSendClient(supportCase, payload.ticketId).closed();
    },
  },
});
