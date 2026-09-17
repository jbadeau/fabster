import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AgentDefinition, WorkflowDefinition } from '@fabster/core';
import type { SandboxPolicy } from '@fabster/runtime';

/**
 * A serializable reference to a workflow: definitions contain functions and
 * cannot cross the journal, so durable runs address them by module.
 * The export may be a WorkflowDefinition or a factory called with `args`.
 */
export interface WorkflowRef {
  readonly module: string;
  readonly workflowExport?: string;
  readonly agentsExport?: string;
  readonly args?: unknown;
  /**
   * Defaults to 'required' in fabrication.ts — the production engine has no
   * implicit trusted-local-demo carve-out. The override exists so tests can
   * exercise fabrication's own logic (the node loop, skip-on-failure
   * propagation, delivery gating) without depending on nono being
   * installed in whatever environment runs the test suite; a real
   * dispatched run should never set this.
   */
  readonly sandbox?: SandboxPolicy;
}

export interface LoadedWorkflow {
  readonly workflow: WorkflowDefinition;
  readonly agents: readonly AgentDefinition[];
}

export async function loadWorkflowRef(ref: WorkflowRef): Promise<LoadedWorkflow> {
  const specifier =
    ref.module.startsWith('.') || path.isAbsolute(ref.module)
      ? pathToFileURL(path.resolve(ref.module)).href
      : ref.module;

  const mod = (await import(specifier)) as Record<string, unknown>;

  const exported = mod[ref.workflowExport ?? 'default'] ?? mod['workflow'];
  const workflow = (typeof exported === 'function' ? exported(ref.args) : exported) as
    | WorkflowDefinition
    | undefined;

  if (!workflow || workflow.kind !== 'workflow') {
    throw new Error(
      `Module "${ref.module}" export "${ref.workflowExport ?? 'default'}" is not a WorkflowDefinition`,
    );
  }

  const agents = (mod[ref.agentsExport ?? 'agents'] ?? []) as readonly AgentDefinition[];
  return { workflow, agents };
}
