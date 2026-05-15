import { Workspace } from '@struktoai/mirage-node';
import type { WorkflowDefinition } from '@fabster/core';
import type { GateResult, NodeResult, NodeState, RunOptions, RunResult } from '../types.js';
import { extractNodes } from './graph.js';
import { executeNode } from './node-executor.js';
import { miseExec, provisionTools } from './mise.js';
import { createBranch, commitChanges } from '../git/branch.js';
import { createMR } from '../git/mr.js';
import { splitGates, runValidationGates, checkReviewGates } from '../gates/gate-checker.js';

function extractCwd(workflow: WorkflowDefinition): string {
  for (const resource of Object.values(workflow.workspace.mounts)) {
    if (resource.kind === 'disk' && 'root' in resource) {
      return (resource as { root: string }).root;
    }
  }
  throw new Error('No DiskResource found in workspace mounts');
}

export async function runWorkflow(
  workflow: WorkflowDefinition,
  options: RunOptions,
): Promise<RunResult> {
  const nodes = extractNodes(workflow);
  const cwd = extractCwd(workflow);

  // Dry run
  if (options.dryRun) {
    return {
      workflow: workflow.name,
      nodes: nodes.map((n) => ({
        id: n.id,
        definition: n.definition,
        state: 'pending' as NodeState,
        branch: `fabster/${workflow.name}/${n.id}`,
        validationGates: [],
        reviewGates: [],
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
      const branch = `fabster/${workflow.name}/${node.id}`;
      const logs: string[] = [];
      let state: NodeState = 'pending';
      let mrUrl: string | undefined;
      let validationGates: GateResult[] = [];
      let reviewGates: GateResult[] = [];

      // Skip if previous node failed
      if (failed) {
        nodeResults.push({
          id: node.id, definition: def, state: 'skipped', branch: '',
          validationGates: [], reviewGates: [],
          duration: 0, logs: ['Skipped — previous node failed'],
        });
        continue;
      }

      try {
        // Skip if branch already exists
        const branchCheck = await miseExec(`git branch --list "${branch}"`, cwd);
        if (branchCheck.stdout.trim() !== '') {
          logs.push(`Branch ${branch} already exists — skipping`);
          nodeResults.push({
            id: node.id, definition: def, state: 'complete', branch,
            validationGates: [], reviewGates: [],
            duration: Date.now() - startTime, logs,
          });
          previousBranch = branch;
          continue;
        }

        // === EXECUTING ===
        state = 'executing';
        logs.push(`[executing] ${def.kind}: ${def.name}`);

        const tools = def.permissions?.tools ?? [];
        if (tools.length > 0) {
          logs.push(`Provisioning tools: ${tools.join(', ')}`);
          await provisionTools(tools, cwd);
        }

        await createBranch(cwd, workflow.name, node.id, previousBranch);
        logs.push(`Created branch: ${branch}`);

        const execResult = await executeNode(node, options.agents, options.models, ws, cwd);
        logs.push(...execResult.logs);

        if (!execResult.success) {
          state = 'failed';
          failed = true;
          nodeResults.push({
            id: node.id, definition: def, state, branch,
            validationGates: [], reviewGates: [],
            duration: Date.now() - startTime, logs,
          });
          continue;
        }

        // === VALIDATING ===
        const { validation, review } = splitGates(def.gates ?? []);

        if (validation.length > 0) {
          state = 'validating';
          logs.push(`[validating] Running ${validation.length} gate(s)`);
          validationGates = await runValidationGates(validation, cwd);

          for (const g of validationGates) {
            logs.push(`  ${g.passed ? '+' : 'x'} ${g.gate.kind}: ${g.detail}`);
          }

          const validationFailed = validationGates.some(
            (g) => !g.passed && g.gate.required !== false,
          );

          if (validationFailed) {
            state = 'failed';
            failed = true;
            logs.push('[failed] Validation gates did not pass');
            nodeResults.push({
              id: node.id, definition: def, state, branch,
              validationGates, reviewGates: [],
              duration: Date.now() - startTime, logs,
            });
            continue;
          }
        }

        // === PUBLISHING ===
        state = 'publishing';
        const commitMessage = `fabster: ${def.name} — ${def.purpose}`;
        const sha = await commitChanges(cwd, commitMessage);
        if (sha) {
          logs.push(`[publishing] Committed: ${sha}`);
        } else {
          logs.push('[publishing] No changes to commit');
        }

        try {
          const mr = await createMR(
            cwd, branch, previousBranch,
            `[fabster] ${def.name}`, def.purpose,
          );
          mrUrl = mr ?? undefined;
          if (mrUrl) logs.push(`[publishing] Created MR: ${mrUrl}`);
        } catch {
          logs.push('[publishing] Skipped MR (no remote or gh not available)');
        }

        // === REVIEWING ===
        if (review.length > 0 && mrUrl) {
          state = 'reviewing';
          logs.push(`[reviewing] Checking ${review.length} review gate(s)`);
          reviewGates = await checkReviewGates(review, cwd, mrUrl);

          for (const g of reviewGates) {
            logs.push(`  ${g.passed ? '+' : '?'} ${g.gate.kind}: ${g.detail}`);
          }

          const reviewPending = reviewGates.some(
            (g) => !g.passed && g.gate.required !== false,
          );

          if (reviewPending) {
            state = 'gated';
            logs.push('[gated] Waiting for human approval');
            nodeResults.push({
              id: node.id, definition: def, state, branch, mr: mrUrl,
              validationGates, reviewGates,
              duration: Date.now() - startTime, logs,
            });
            previousBranch = branch;
            continue;
          }
        }

        // === COMPLETE ===
        state = 'complete';
        logs.push('[complete]');

      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logs.push(`ERROR: ${message}`);
        state = 'failed';
        failed = true;
      }

      nodeResults.push({
        id: node.id, definition: def, state, branch, mr: mrUrl,
        validationGates, reviewGates,
        duration: Date.now() - startTime, logs,
      });

      previousBranch = branch;
    }
  } finally {
    await ws.close();
  }

  const overallStatus = nodeResults.some((n) => n.state === 'failed')
    ? 'failed'
    : nodeResults.some((n) => n.state === 'gated')
      ? 'gated'
      : 'success';

  return { workflow: workflow.name, nodes: nodeResults, status: overallStatus };
}
