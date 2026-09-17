import type { Permissions } from '@fabster/core';
import { isNonoAvailable, wrapWithNono } from './nono.js';

/**
 * Whether a run requires nono to actually be present. 'required' (the
 * default) fails the run loudly when nono is missing, rather than the
 * previous behavior of silently executing every node unsandboxed. Only a
 * caller that explicitly opts into 'disabled' (trusted local dev, a demo
 * with no untrusted input) gets that fallback.
 */
export type SandboxPolicy = 'required' | 'disabled';

/**
 * Per-node sandbox state, set by the runner before executing each node.
 * Effects (miseExec, the external-agent effect) read this to wrap their
 * processes with nono. Commands and tasks are unaware of sandboxing.
 */
let currentPermissions: Permissions | undefined;
let nonoEnabled = false;

/**
 * Called by the runner before executing a node.
 * Sets the sandbox permissions for all subsequent process spawns.
 */
export async function enterSandbox(permissions: Permissions | undefined, policy: SandboxPolicy): Promise<void> {
  currentPermissions = permissions;

  // 'disabled' is a true opt-out: nono never engages, even if it happens to
  // be installed. Without this early return, `nonoEnabled` was set purely
  // from availability — a caller that explicitly asked to skip the sandbox
  // still got wrapped in it on any machine that has nono installed, since
  // `policy` was only ever consulted for the throw below, never for
  // whether to actually turn the sandbox on.
  if (policy === 'disabled') {
    nonoEnabled = false;
    return;
  }

  const available = await isNonoAvailable();
  if (!available) {
    throw new Error(
      'Sandbox required: install nono, or explicitly pass sandbox: "disabled" for trusted local work.',
    );
  }
  nonoEnabled = true;
}

/**
 * Called by the runner after a node finishes.
 */
export function exitSandbox(): void {
  currentPermissions = undefined;
}

/**
 * Wrap a command string with nono sandbox if enabled.
 * Called by miseExec and any other process spawner.
 */
export function sandboxWrap(command: string, cwd: string): string {
  if (!nonoEnabled || !currentPermissions) return command;
  return wrapWithNono(command, cwd, currentPermissions);
}

/**
 * Get the current sandbox permissions (for external agent executor).
 */
export function getSandboxPermissions(): Permissions | undefined {
  return currentPermissions;
}

/**
 * Check if sandbox is active.
 */
export function isSandboxActive(): boolean {
  return nonoEnabled && currentPermissions !== undefined;
}
