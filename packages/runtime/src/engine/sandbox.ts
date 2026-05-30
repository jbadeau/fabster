import type { Permissions } from '@fabster/core';
import { isNonoAvailable, wrapWithNono } from './nono.js';

/**
 * Per-node sandbox state, set by the runner before executing each node.
 * Executors (miseExec, external-agent-executor) read this to wrap their
 * processes with nono. Commands and tasks are unaware of sandboxing.
 */
let currentPermissions: Permissions | undefined;
let nonoEnabled = false;

/**
 * Called by the runner before executing a node.
 * Sets the sandbox permissions for all subsequent process spawns.
 */
export async function enterSandbox(permissions?: Permissions): Promise<void> {
  currentPermissions = permissions;
  nonoEnabled = await isNonoAvailable();
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
