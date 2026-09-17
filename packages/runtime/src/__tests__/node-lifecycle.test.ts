import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { task, externalAgent, gate, provide, require } from '@fabster/core';
import type { CommandAgentAdapter } from '@fabster/core';
import { runNode } from '../engine/node-lifecycle.js';
import { createRunBranch, ensureInitialCommit } from '../git/branch.js';
import { miseExec } from '../engine/mise.js';

/**
 * A fake "agent" — a shell script standing in for a real CLI. It logs each
 * invocation's full prompt (what it received on stdin) to a numbered file,
 * so the test can inspect exactly what the retry loop actually told it, and
 * only signals "done" on its Nth invocation, forcing real retries through
 * runNode's own loop rather than mocking it away.
 */
function fakeAgent(scriptPath: string, succeedOnAttempt: number): ReturnType<typeof externalAgent> {
  const adapter: CommandAgentAdapter = { kind: 'command', command: 'sh', args: [scriptPath] };
  return externalAgent('fake-agent', {
    role: 'test',
    goal: 'test',
    backstory: '',
    capabilities: [provide('agent.skill', { name: 'testing' })],
    adapter,
  });
}

describe('runNode — retry evidence', () => {
  it('accumulates every failed attempt, not just the most recent, into the next prompt', async () => {
    // Three real git-worktree create/remove cycles plus three real
    // subprocess spawns — slower than the default timeout under full-suite
    // parallel load, even though it's fast in isolation.
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-node-lifecycle-'));
    const scriptPath = join(cwd, 'fake-agent.sh');
    const promptLogPrefix = join(cwd, 'prompt-attempt-');
    const counterFile = join(cwd, 'attempt-count');
    try {
      await miseExec('git init -q', cwd);
      await miseExec('git config user.email t@t.com', cwd);
      await miseExec('git config user.name test', cwd);
      await ensureInitialCommit(cwd);
      const runBranch = 'fabster/retry-test';
      await createRunBranch(cwd, runBranch);

      // Reads the whole prompt from stdin, logs it to attempt-<n>, and
      // never produces a passing marker until the 3rd invocation.
      await writeFile(
        scriptPath,
        `#!/bin/sh
count_file="${counterFile}"
n=1
if [ -f "$count_file" ]; then n=$(($(cat "$count_file") + 1)); fi
echo "$n" > "$count_file"
cat > "${promptLogPrefix}$n.txt"
if [ "$n" -ge 3 ]; then touch "${join(cwd, 'ready')}"; fi
exit 0
`,
        { mode: 0o755 },
      );

      const succeedsOnThirdAttempt = task({
        name: 'flaky-task',
        purpose: 'A task whose post-gate only passes on the 3rd attempt',
        requirements: [require('agent.skill', { name: 'testing' })],
        retries: 3,
        inputs: {},
        post: [gate('ready-marker', { check: `[ -f ${join(cwd, 'ready')} ]` })],
      });

      const outcome = await runNode({
        node: { id: 'flaky', definition: succeedsOnThirdAttempt, inputs: {}, dependsOn: [] },
        resolvedInputs: {},
        repoCwd: cwd,
        runBranch,
        agents: [fakeAgent(scriptPath, 3)],
        sandbox: 'disabled',
      });

      expect(outcome.result.state).toBe('complete');

      // Attempt 3's prompt must contain evidence from BOTH attempt 1 and
      // attempt 2's failures — not just attempt 2's, which is what the
      // pre-fix implementation (overwriting retryEvidence each attempt)
      // would have produced.
      const thirdPrompt = await readFile(`${promptLogPrefix}3.txt`, 'utf8');
      expect(thirdPrompt).toContain('Attempt 1 of 3 failed');
      expect(thirdPrompt).toContain('Attempt 2 of 3 failed');

      // And attempt 2's prompt must NOT yet mention attempt 2 (it hasn't
      // happened from its own point of view) but must mention attempt 1.
      const secondPrompt = await readFile(`${promptLogPrefix}2.txt`, 'utf8');
      expect(secondPrompt).toContain('Attempt 1 of 3 failed');
      expect(secondPrompt).not.toContain('Attempt 2 of 3 failed');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }, 20000);
});
