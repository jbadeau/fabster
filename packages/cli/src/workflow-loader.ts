import { pathToFileURL } from 'node:url';
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { WorkflowDefinition, AgentDefinition } from '@fabster/core';

export interface LoadedWorkflow {
  workflow: WorkflowDefinition;
  agents: readonly AgentDefinition[];
}

interface WorkflowModule {
  default?: WorkflowDefinition;
  workflow?: WorkflowDefinition;
  agents?: readonly AgentDefinition[];
}

/** Dynamically import a workflow file and validate its required exports. */
export async function loadWorkflowModule(file: string): Promise<LoadedWorkflow> {
  const absolutePath = path.resolve(file);
  const mod = (await import(pathToFileURL(absolutePath).href)) as WorkflowModule;

  const workflow = mod.default ?? mod.workflow;
  if (!workflow) {
    throw new Error(
      'Workflow file must export a WorkflowDefinition as default or named "workflow"',
    );
  }

  return { workflow, agents: mod.agents ?? [] };
}

export interface DiscoveredWorkflow {
  name: string;
  path: string;
}

/** Scan the conventional directories for `*workflow.ts` files. */
export async function discoverWorkflows(
  cwd: string = process.cwd(),
): Promise<DiscoveredWorkflow[]> {
  const dirs = ['examples', 'workflows'];
  const out: DiscoveredWorkflow[] = [];

  for (const dir of dirs) {
    const abs = path.join(cwd, dir);
    if (!existsSync(abs)) continue;
    const entries = (await readdir(abs, { recursive: true })) as string[];
    for (const entry of entries) {
      if (entry.endsWith('workflow.ts')) {
        const filePath = path.join(dir, entry);
        out.push({
          name: path.dirname(filePath).split(path.sep).pop() ?? filePath,
          path: filePath,
        });
      }
    }
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}
