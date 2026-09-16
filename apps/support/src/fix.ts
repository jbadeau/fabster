/**
 * The fix run — BPMN Process_Fix as a Fabster workflow. Apply + validate is
 * the task's effect + post-gates; publishing the MR is the engine-owned
 * delivery. The GUIDANCE / NEEDS_* end states are the support layer's
 * interpretation of a failed run, never engine states.
 */
import {
  claudeCodeAgent,
  mergeRequest,
  provide,
  require,
  string,
  successfulBuild,
  task,
  testsPass,
  workflow,
  workspace,
  type Gate,
} from '@fabster/core';

export const supportFixer = claudeCodeAgent('support-fixer', {
  role: 'Support engineer applying an approved fix',
  goal: 'Apply exactly the approved fix plan and verify it',
  backstory:
    'You apply a fix plan that the requester has already approved. Stay strictly within the plan; if the plan turns out to be wrong, stop and report rather than improvising a different change.',
  capabilities: [provide('agent.skill', { name: 'code-fix' })],
});

export function supportFixWorkflow(options: {
  readonly repo: string;
  readonly ticketId: string;
  readonly plan: string;
  readonly findings: string;
  /** Post-gates for the fix. Defaults to build + tests. */
  readonly post?: readonly Gate[];
}) {
  const applyFix = task({
    name: 'apply-approved-fix',
    purpose:
      'Apply the approved fix plan to the repository, exactly as approved by the requester.',
    requirements: [require('agent.skill', { name: 'code-fix' })],
    inputs: {
      plan: string('The fix plan the requester approved'),
      findings: string('Findings from the read-only investigation'),
    },
    outputs: {
      summary: string('One-sentence description of what the fix changed'),
    },
    retries: 1,
    post: options.post ?? [successfulBuild(), testsPass()],
  });

  return workflow({
    name: `support-fix-${options.ticketId}`,
    purpose: `Support fix for ticket ${options.ticketId}`,
    workspace: workspace(options.repo),
    delivery: mergeRequest(),
    graph: (ctx) => {
      ctx.run('apply-fix', applyFix, {
        plan: options.plan,
        findings: options.findings,
      });
    },
  });
}

/** Agent roster the fabrication engine loads alongside the fix workflow. */
export const supportFixAgents = [supportFixer];
