import { describe, expect, it } from 'vitest';
import { enterSandbox, exitSandbox, isSandboxActive } from '../engine/sandbox.js';
import { isNonoAvailable } from '../engine/nono.js';

describe('enterSandbox', () => {
  it('fails a required sandbox instead of silently running unsandboxed when nono is missing', async () => {
    // This assumes nono is not installed in the test environment — true in
    // CI and in most dev setups. Skip if it somehow is, rather than assert
    // a false negative.
    if (await isNonoAvailable()) return;

    await expect(enterSandbox(undefined, 'required')).rejects.toThrow(/sandbox required/i);
    expect(isSandboxActive()).toBe(false);
  });

  it('a "disabled" opt-out never engages the sandbox, even when nono is installed', async () => {
    // Regression test: the first implementation set nonoEnabled purely from
    // isNonoAvailable(), consulting `policy` only for the throw-if-missing
    // check below — so an explicit 'disabled' opt-out was silently ignored
    // on any machine that happened to have nono installed, and the run got
    // sandboxed anyway. 'disabled' must mean "never," independent of
    // availability.
    await enterSandbox({ fs: { read: ['/repo/**'], write: [] } }, 'disabled');
    try {
      expect(isSandboxActive()).toBe(false);
    } finally {
      exitSandbox();
    }
  });

  it('a "required" sandbox engages when nono is available', async () => {
    if (!(await isNonoAvailable())) return; // not installed in this environment

    await enterSandbox({ fs: { read: ['/repo/**'], write: [] } }, 'required');
    try {
      expect(isSandboxActive()).toBe(true);
    } finally {
      exitSandbox();
    }
  });
});
