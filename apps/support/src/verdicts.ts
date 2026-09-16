/**
 * The LLM seams: schema-validated verdicts. The model proposes; the case
 * handler's deterministic code routes. A response that fails schema
 * validation is a VerdictSchemaError — the service marks it terminal so the
 * retry budget is never burned re-asking a prompt that produced bad output.
 */
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { RunResult } from '@fabster/runtime';
import type { ApproachVerdict, FixDiagnosis, InfoVerdict } from './types.js';

export class VerdictSchemaError extends Error {}

const MODEL = 'claude-opus-5';

const InfoSchema = z.object({
  ready: z.boolean(),
  missing: z.array(z.string()),
  repo: z.string().nullable(),
});

const ApproachSchema = z.object({
  kind: z.enum(['code-fix', 'chat-answer', 'handoff']),
  plan: z.string().nullable(),
  answer: z.string().nullable(),
  reason: z.string().nullable(),
});

const DiagnosisSchema = z.object({
  kind: z.enum(['guidance', 'needs-information', 'needs-developers']),
  guidance: z.string().nullable(),
  questions: z.array(z.string()),
  summary: z.string().nullable(),
});

export interface VerdictServices {
  assessInformation(context: string): Promise<InfoVerdict>;
  chooseApproach(findings: string): Promise<ApproachVerdict>;
  diagnoseFailure(run: RunResult): Promise<FixDiagnosis>;
}

export function anthropicVerdicts(client: Anthropic = new Anthropic()): VerdictServices {
  async function parse<T>(schema: z.ZodType<T>, system: string, prompt: string): Promise<T> {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: zodOutputFormat(schema as z.ZodType) },
    });
    if (response.parsed_output === null || response.parsed_output === undefined) {
      throw new VerdictSchemaError('Model response did not match the verdict schema');
    }
    return response.parsed_output as T;
  }

  return {
    async assessInformation(context) {
      const v = await parse(
        InfoSchema,
        'You triage support requests. Decide whether the conversation contains enough information to start a read-only investigation: at minimum a repository path or URL and a concrete symptom (failing command, error message, or observed misbehavior). Extract the repository if present. List only genuinely missing items.',
        `Conversation so far:\n${context}`,
      );
      return { ready: v.ready, missing: v.missing, repo: v.repo };
    },

    async chooseApproach(findings) {
      const v = await parse(
        ApproachSchema,
        'You decide the next step for a support case from investigation findings. kind=code-fix when a concrete, low-risk repository change would resolve it (set plan to the exact change and how to verify it). kind=chat-answer when guidance resolves it without a code change (set answer). kind=handoff when no credible solution exists or the change is too risky (set reason).',
        `Investigation findings:\n${findings}`,
      );
      if (v.kind === 'code-fix' && v.plan) return { kind: 'code-fix', plan: v.plan };
      if (v.kind === 'chat-answer' && v.answer) return { kind: 'chat-answer', answer: v.answer };
      if (v.kind === 'handoff' && v.reason) return { kind: 'handoff', reason: v.reason };
      throw new VerdictSchemaError(`Approach verdict "${v.kind}" is missing its payload`);
    },

    async diagnoseFailure(run) {
      const evidence = run.nodes
        .flatMap((n) => [...n.entryGates, ...n.postGates])
        .map((g) => `${g.passed ? 'PASS' : 'FAIL'} ${g.gate.kind}: ${g.detail ?? ''}`)
        .join('\n');
      const logs = run.nodes.flatMap((n) => n.logs).slice(-40).join('\n');
      const v = await parse(
        DiagnosisSchema,
        'A verified-fix attempt failed its gates. Interpret the evidence. kind=guidance when a workaround or manual instruction would genuinely help (set guidance). kind=needs-information when specific answers from the requester would unblock another attempt (set questions). kind=needs-developers when the problem needs humans with full context (set summary of what failed and why no fallback remains).',
        `Gate evidence:\n${evidence}\n\nRun log tail:\n${logs}`,
      );
      if (v.kind === 'guidance' && v.guidance) return { kind: 'guidance', guidance: v.guidance };
      if (v.kind === 'needs-information' && v.questions.length > 0) {
        return { kind: 'needs-information', questions: v.questions };
      }
      if (v.kind === 'needs-developers' && v.summary) return { kind: 'needs-developers', summary: v.summary };
      throw new VerdictSchemaError(`Diagnosis verdict "${v.kind}" is missing its payload`);
    },
  };
}
