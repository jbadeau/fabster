import type { Resource } from '@struktoai/mirage-core';
import type { WorkspaceDefinition } from '../types/workspace.js';

export function workspace(
  mounts: Record<string, Resource>,
): WorkspaceDefinition {
  return Object.freeze({ mounts });
}
