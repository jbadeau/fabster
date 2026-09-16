/**
 * End-to-end demo of the support workflow.
 *
 * Sets up a scratch git repository with a known bug, then drives the support
 * case through the full happy path of the BPMN:
 *
 *   request → missing details → investigate → propose fix → requester
 *   approves → REAL Fabster run (worktree, effect, outputs contract,
 *   custom check gate, engine commit on the run branch) → resolution → close
 *
 * The Webex waits are a scripted event queue and the LLM verdicts are
 * deterministic stubs — those are the seams that Restate durable promises
 * and schema-validated model calls fill in production. The Fabster run is
 * not stubbed: it executes for real against the scratch repository.
 *
 * Run from the repo root:  npx tsx examples/support/run.ts
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gate } from '@fabster/core';
import { runWorkflow } from '@fabster/runtime';
import { handleSupportCase, supportFixWorkflow, type SupportEvent } from '@fabster/support';
import { demoFixerAgent } from './fix-workflow.ts';

const TICKET = 'T-1042';

// --- Scratch repository with a known bug -----------------------------------

const repo = mkdtempSync(join(tmpdir(), 'fabster-support-demo-'));
const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();

writeFileSync(join(repo, 'service.js'), 'module.exports.add = (a, b) => a - b;\n');
writeFileSync(
  join(repo, 'test.sh'),
  `#!/bin/sh
node -e "const { add } = require('./service.js'); if (add(2, 3) !== 5) { console.error('add(2, 3) returned ' + add(2, 3)); process.exit(1); } console.log('test ok');"
`,
);
git('init');
git('config', 'user.email', 'demo@example.com');
git('config', 'user.name', 'Support Demo');
git('add', '-A');
git('commit', '-m', 'seed: service with subtraction bug');

console.log(`Scratch repository: ${repo}\n`);

// --- Scripted Webex events (durable promises, in production) ----------------

const events: SupportEvent[] = [
  { type: 'requester-message', text: `repo: ${repo} — add(2, 3) returns -1, test.sh fails` },
  { type: 'requester-choice', choice: 'try-fix' },
  { type: 'requester-choice', choice: 'close' },
];

// --- Deterministic stand-ins for the LLM seams ------------------------------

const result = await handleSupportCase(
  'The math service is broken since yesterday.',
  {
    async post(message) {
      console.log(`[webex] ${message.split('\n')[0]}`);
    },
    async wait() {
      const event = events.shift();
      if (!event) return { type: 'ticket-closed' };
      console.log(`[event] ${JSON.stringify(event)}`);
      return event;
    },
    async assessInformation(context) {
      // Production: schema-validated LLM verdict. The checklist decides.
      return context.includes('repo: ')
        ? { ready: true, missing: [] }
        : { ready: false, missing: ['repository path', 'failing command or error message'] };
    },
    async investigate(context) {
      // Production: read-only agent over repository + chat + RAG.
      const source = readFileSync(join(repo, 'service.js'), 'utf8');
      return `service.js implements add() as subtraction: ${source.trim()} (context: ${context.split('\n').length} messages)`;
    },
    async chooseApproach(findings) {
      return findings.includes('a - b')
        ? { kind: 'code-fix', plan: 'In service.js, change add() to return a + b instead of a - b, then run test.sh.' }
        : { kind: 'handoff', reason: 'No credible root cause found.' };
    },
    async runFix(plan, findings) {
      // The real thing: a Fabster run against the scratch repository.
      const fix = supportFixWorkflow({
        repo,
        ticketId: TICKET,
        plan,
        findings,
        post: [gate('tests-pass', { description: "The repository's own test script passes", check: 'sh test.sh' })],
      });
      return runWorkflow(fix, { agents: [demoFixerAgent()] });
    },
    async diagnoseFailure(run) {
      const evidence = run.nodes
        .flatMap((n) => [...n.entryGates, ...n.postGates])
        .filter((g) => !g.passed)
        .map((g) => `${g.gate.kind}: ${g.detail}`)
        .join('; ');
      return { kind: 'needs-developers', summary: `Fix attempt failed — ${evidence || 'see run logs'}` };
    },
  },
);

// --- Report ------------------------------------------------------------------

console.log(`\nCase outcome: ${result.outcome}`);
console.log(`Trace: ${result.trace.join(' → ')}`);

const run = result.fixRun;
if (!run) {
  console.error('Expected a fix run to have happened.');
  process.exit(1);
}

console.log(`\nFix run "${run.workflow}": ${run.status}`);
for (const node of run.nodes) {
  console.log(`  node ${node.id}: ${node.state}, outputs: ${JSON.stringify(node.outputs)}`);
}

const runBranch = `fabster/${run.workflow}`;
console.log(`\nEngine commits on ${runBranch}:`);
console.log(git('log', runBranch, '--oneline'));
console.log(`\nmain is untouched (still buggy until the MR merges):`);
console.log(`  ${readFileSync(join(repo, 'service.js'), 'utf8').trim()}`);
console.log(`\nverified fix on the run branch:`);
console.log(`  ${git('show', `${runBranch}:service.js`).trim()}`);

const ok =
  result.outcome === 'resolved' &&
  run.status === 'success' &&
  git('show', `${runBranch}:service.js`).includes('a + b') &&
  readFileSync(join(repo, 'service.js'), 'utf8').includes('a - b');

console.log(ok ? '\nOK — support flow and fix run behaved as designed.' : '\nFAILED — see output above.');
process.exit(ok ? 0 : 1);
