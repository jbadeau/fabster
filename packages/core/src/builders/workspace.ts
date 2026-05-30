import type { WorkspaceDefinition } from '../types/workspace.js';

export function workspace(root: string): WorkspaceDefinition {
  return Object.freeze({ root });
}
