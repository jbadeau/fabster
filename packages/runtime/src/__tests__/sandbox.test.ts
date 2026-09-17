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

  it('allows an explicit "disabled" opt-out for trusted local work', async () => {
    await enterSandbox({ fs: { read: ['/repo/**'], write: [] } }, 'disabled');
    try {
      // Never claims to be active when nono itself isn't present, even
      // though the policy permitted proceeding.
      expect(isSandboxActive()).toBe(await isNonoAvailable());
    } finally {
      exitSandbox();
    }
  });
});
