import { Workspace } from '@struktoai/mirage-node';
import type { WorkflowDefinition } from '@fabster/core';
import type { NodeResult, NodeStatus, RunOptions, RunResult } from '../types.js';
import { extractNodes } from './graph.js';
import { executeNode } from './node-executor.js';
import { provisionTools } from './mise.js';
import { createBranch, commitChanges } from '../git/branch.js';
import { createMR } from '../git/mr.js';
import { checkGates } from '../gates/gate-checker.js';

/**
 * Extract the root directory from the workspace mounts.
 * Looks for a DiskResource and returns its root path.
 */
function extractCwd(workflow: WorkflowDefinition): string {
  for (const resource of Object.values(workflow.workspace.mounts)) {
    if (resource.kind === 'disk' && 'root' in resource) {
      return (resource as { root: string }).root;
    }
  }
  throw new Error('No DiskResource found in workspace mounts — cannot determine working directory');
}

export async function runWorkflow(
  workflow: WorkflowDefinition,
  options: RunOptions,
): Promise<RunResult> {
  const nodes = extractNodes(workflow);
  const cwd = extractCwd(workflow);

  // Dry run — validate graph only
  if (options.dryRun) {
    return {
      workflow: workflow.name,
      nodes: nodes.map((n) => ({
        id: n.id,
        definition: n.definition,
        status: 'pending' as NodeStatus,
        branch: `fabster/${workflow.name}/${n.id}`,
        gates: [],
        duration: 0,
        logs: [`[dry-run] Would execute ${n.definition.kind}: ${n.definition.name}`],
      })),
      status: 'success',
    };
  }

  const ws = new Workspace(workflow.workspace.mounts, { mode: 'exec' });
  const nodeResults: NodeResult[] = [];
  let previousBranch = 'main';
  let failed = false;

  try {
    for (const node of nodes) {
      const startTime = Date.now();
      const def = node.definition;

      if (failed) {
        nodeResults.push({
          id: node.id,
          definition: def,
          status: 'skipped',
          branch: '',
          gates: [],
          duration: 0,
          logs: ['Skipped — previous node failed'],
        });
        continue;
      }

      const logs: string[] = [];
      let status: NodeStatus = 'success';
      let branch = '';
      let mrUrl: string | undefined;
      let gateResults: import('../types.js').GateResult[] = [];

      try {
        // Provision tools declared in permissions
        const tools = def.permissions?.tools ?? [];
        if (tools.length > 0) {
          logs.push(`Provisioning tools: ${tools.join(', ')}`);
          await provisionTools(tools, cwd);
        }

        // Create stacked branch
        branch = await createBranch(
          cwd,
          workflow.name,
          node.id,
          previousBranch,
        );
        logs.push(`Created branch: ${branch}`);

        // Execute the node
        const execResult = await executeNode(
          node,
          options.agents,
          options.models,
          ws,
          cwd,
        );
        logs.push(...execResult.logs);

        if (!execResult.success) {
          status = 'failed';
          failed = true;
        }

        // Commit changes
        if (status === 'success') {
          const commitMessage = `fabster: ${def.name} — ${def.purpose}`;
          const sha = await commitChanges(cwd, commitMessage);
          if (sha) {
            logs.push(`Committed: ${sha}`);
          } else {
            logs.push('No changes to commit');
          }
        }

        // Create MR (skip if no remote or failed)
        if (status === 'success') {
          try {
            const mr = await createMR(
              cwd,
              branch,
              previousBranch,
              `[fabster] ${def.name}`,
              def.purpose,
            );
            mrUrl = mr ?? undefined;
            if (mrUrl) logs.push(`Created MR: ${mrUrl}`);
          } catch {
            logs.push('Skipped MR creation (no remote or gh not available)');
          }
        }

        // Check gates
        if (def.gates && mrUrl) {
          gateResults = await checkGates(def.gates, cwd, mrUrl);
          const gatesFailed = gateResults.some(
            (g) => !g.passed && g.gate.required !== false,
          );
          if (gatesFailed) {
            status = 'gated';
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logs.push(`ERROR: ${message}`);
        status = 'failed';
        failed = true;
      }

      const duration = Date.now() - startTime;

      nodeResults.push({
        id: node.id,
        definition: def,
        status,
        branch,
        mr: mrUrl,
        gates: gateResults,
        duration,
        logs,
      });

      previousBranch = branch;

      if (status === 'failed') {
        failed = true;
      }
    }
  } finally {
    await ws.close();
  }

  const overallStatus = nodeResults.some((n) => n.status === 'failed')
    ? 'failed'
    : nodeResults.some((n) => n.status === 'gated')
      ? 'gated'
      : 'success';

  return {
    workflow: workflow.name,
    nodes: nodeResults,
    status: overallStatus,
  };
}
