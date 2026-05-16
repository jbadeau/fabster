import { Workspace } from '@struktoai/mirage-node';
import { DiskResource } from '@struktoai/mirage-node';
import type { InputValue, WorkflowDefinition } from '@fabster/core';
import type { GateResult, NodeResult, NodeState, RunOptions, RunResult, WorkflowEvent } from '../types.js';
import { extractNodes } from './graph.js';
import { executeNode } from './node-executor.js';
import { provisionTools } from './mise.js';
import {
  createWorktree,
  commitChanges,
  removeWorktree,
  branchExists,
  ensureInitialCommit,
} from '../git/branch.js';
import { createMR } from '../git/mr.js';
import { splitGates, runValidationGates, checkReviewGates } from '../gates/gate-checker.js';

function resolveInputs(
  inputs: Record<string, InputValue>,
  nodeOutputs: Map<string, Record<string, string | number | boolean>>,
): Record<string, string | number | boolean> {
  const resolved: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'object' && value !== null && '_tag' in value && value._tag === 'outputRef') {
      const outputs = nodeOutputs.get(value.nodeId);
      if (!outputs || !(value.outputName in outputs)) {
        throw new Error(`Output "${value.outputName}" not found on node "${value.nodeId}"`);
      }
      resolved[key] = outputs[value.outputName];
    } else {
      resolved[key] = value as string | number | boolean;
    }
  }

  return resolved;
}

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
  const repoCwd = extractCwd(workflow);
  const emit = options.emitter
    ? (data: WorkflowEvent) => { options.emitter!.emit('progress', data); }
    : undefined;

  // Dry run
  if (options.dryRun) {
    const result: RunResult = {
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
        outputs: {},
      })),
      status: 'success',
    };
    emit?.({ type: 'workflow:done', status: 'success' });
    return result;
  }

  // Ensure repo has at least one commit
  await ensureInitialCommit(repoCwd);

  const nodeResults: NodeResult[] = [];
  const nodeOutputs = new Map<string, Record<string, string | number | boolean>>();
  let previousBranch = 'main';
  let failed = false;

  for (const node of nodes) {
    const startTime = Date.now();
    const def = node.definition;
    const branch = `fabster/${workflow.name}/${node.id}`;
    const logs: string[] = [];
    let state: NodeState = 'pending';
    let mrUrl: string | undefined;
    let validationGates: GateResult[] = [];
    let reviewGates: GateResult[] = [];

    if (failed) {
      emit?.({ type: 'node:state', nodeId: node.id, state: 'skipped', log: 'Skipped — previous node failed' });
      nodeResults.push({
        id: node.id, definition: def, state: 'skipped', branch: '',
        validationGates: [], reviewGates: [],
        duration: 0, logs: ['Skipped — previous node failed'], outputs: {},
      });
      continue;
    }

    try {
      const resolvedInputs = resolveInputs(node.inputs, nodeOutputs);

      // Skip if branch already exists
      if (await branchExists(repoCwd, branch)) {
        const outputs = collectDeclaredOutputs(def, resolvedInputs);
        nodeOutputs.set(node.id, outputs);
        logs.push(`Branch ${branch} already exists — skipping`);
        emit?.({ type: 'node:state', nodeId: node.id, state: 'complete', log: `Branch ${branch} already exists — skipping` });
        nodeResults.push({
          id: node.id, definition: def, state: 'complete', branch,
          validationGates: [], reviewGates: [],
          duration: Date.now() - startTime, logs, outputs,
        });
        previousBranch = branch;
        continue;
      }

      // === EXECUTING ===
      state = 'executing';
      logs.push(`[executing] ${def.kind}: ${def.name}`);
      if (emit) {
        emit({ type: 'node:state', nodeId: node.id, state: 'executing' });
        emit({ type: 'node:log', nodeId: node.id, message: `[executing] ${def.kind}: ${def.name}` });
      } else {
        console.log(`  ⟳ ${node.id} [executing] ${def.kind}: ${def.name}`);
      }

      // Create isolated worktree for this node
      const worktree = await createWorktree(repoCwd, workflow.name, node.id, previousBranch);
      logs.push(`Created worktree: ${worktree.worktreePath} (branch: ${worktree.branch})`);

      const worktreeCwd = worktree.worktreePath;

      // Provision tools in the worktree
      const tools = def.permissions?.tools ?? [];
      if (tools.length > 0) {
        const toolLog = `Provisioning tools: ${tools.join(', ')}`;
        logs.push(toolLog);
        emit?.({ type: 'node:log', nodeId: node.id, message: toolLog });
        await provisionTools(tools, worktreeCwd);
      }

      // Create a Mirage workspace pointing at the worktree
      const ws = new Workspace(
        { '/repo': new DiskResource({ root: worktreeCwd }) },
        { mode: 'exec' },
      );

      try {
        const execResult = await executeNode(node, resolvedInputs, options.agents, options.models, ws, worktreeCwd, emit ? (msg) => emit({ type: 'node:log', nodeId: node.id, message: msg }) : undefined);
        logs.push(...execResult.logs);

        nodeOutputs.set(node.id, execResult.outputs);

        if (!execResult.success) {
          state = 'failed';
          failed = true;
          emit?.({ type: 'node:state', nodeId: node.id, state: 'failed', log: 'Execution failed' });
          nodeResults.push({
            id: node.id, definition: def, state, branch,
            validationGates: [], reviewGates: [],
            duration: Date.now() - startTime, logs, outputs: execResult.outputs,
          });
          await removeWorktree(repoCwd, worktreeCwd);
          continue;
        }

        // === VALIDATING ===
        const { validation, review } = splitGates(def.gates ?? []);

        if (validation.length > 0) {
          state = 'validating';
          if (emit) {
            emit({ type: 'node:state', nodeId: node.id, state: 'validating' });
          } else {
            console.log(`  ? ${node.id} [validating]`);
          }
          logs.push(`[validating] Running ${validation.length} gate(s)`);
          validationGates = await runValidationGates(validation, worktreeCwd);

          for (const g of validationGates) {
            logs.push(`  ${g.passed ? '+' : 'x'} ${g.gate.kind}: ${g.detail}`);
            emit?.({ type: 'node:gate', nodeId: node.id, gate: g });
          }

          const validationFailed = validationGates.some(
            (g) => !g.passed && g.gate.required !== false,
          );

          if (validationFailed) {
            state = 'failed';
            failed = true;
            logs.push('[failed] Validation gates did not pass');
            emit?.({ type: 'node:state', nodeId: node.id, state: 'failed', log: 'Validation gates did not pass' });
            nodeResults.push({
              id: node.id, definition: def, state, branch,
              validationGates, reviewGates: [],
              duration: Date.now() - startTime, logs, outputs: execResult.outputs,
            });
            await removeWorktree(repoCwd, worktreeCwd);
            continue;
          }
        }

        // === PUBLISHING ===
        state = 'publishing';
        if (emit) {
          emit({ type: 'node:state', nodeId: node.id, state: 'publishing' });
        } else {
          console.log(`  ^ ${node.id} [publishing]`);
        }
        const commitMessage = `fabster: ${def.name} — ${def.purpose}`;
        const sha = await commitChanges(worktreeCwd, commitMessage);
        if (sha) {
          logs.push(`[publishing] Committed: ${sha}`);
          emit?.({ type: 'node:log', nodeId: node.id, message: `[publishing] Committed: ${sha}` });
        } else {
          logs.push('[publishing] No changes to commit');
          emit?.({ type: 'node:log', nodeId: node.id, message: '[publishing] No changes to commit' });
        }

        try {
          const mr = await createMR(
            worktreeCwd, branch, previousBranch,
            `[fabster] ${def.name}`, def.purpose,
          );
          mrUrl = mr ?? undefined;
          if (mrUrl) {
            logs.push(`[publishing] Created MR: ${mrUrl}`);
            emit?.({ type: 'node:mr', nodeId: node.id, mr: mrUrl });
          }
        } catch {
          logs.push('[publishing] Skipped MR (no remote or gh not available)');
          emit?.({ type: 'node:log', nodeId: node.id, message: '[publishing] Skipped MR (no remote or gh not available)' });
        }

        // === REVIEWING ===
        if (review.length > 0 && mrUrl) {
          state = 'reviewing';
          emit?.({ type: 'node:state', nodeId: node.id, state: 'reviewing' });
          logs.push(`[reviewing] Checking ${review.length} review gate(s)`);
          reviewGates = await checkReviewGates(review, worktreeCwd, mrUrl);

          for (const g of reviewGates) {
            logs.push(`  ${g.passed ? '+' : '?'} ${g.gate.kind}: ${g.detail}`);
            emit?.({ type: 'node:gate', nodeId: node.id, gate: g });
          }

          const reviewPending = reviewGates.some(
            (g) => !g.passed && g.gate.required !== false,
          );

          if (reviewPending) {
            state = 'gated';
            logs.push('[gated] Waiting for human approval');
            emit?.({ type: 'node:state', nodeId: node.id, state: 'gated', log: 'Waiting for human approval' });
            nodeResults.push({
              id: node.id, definition: def, state, branch, mr: mrUrl,
              validationGates, reviewGates,
              duration: Date.now() - startTime, logs, outputs: nodeOutputs.get(node.id) ?? {},
            });
            previousBranch = branch;
            await removeWorktree(repoCwd, worktreeCwd);
            continue;
          }
        }

        // === COMPLETE ===
        state = 'complete';
        if (emit) {
          emit({ type: 'node:state', nodeId: node.id, state: 'complete' });
        } else {
          console.log(`  + ${node.id} [complete] (${Math.round((Date.now() - startTime) / 1000)}s)`);
        }
        logs.push('[complete]');

        // Clean up worktree
        await ws.close();
        await removeWorktree(repoCwd, worktreeCwd);

      } catch (err) {
        await ws.close();
        await removeWorktree(repoCwd, worktreeCwd);
        throw err;
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logs.push(`ERROR: ${message}`);
      state = 'failed';
      failed = true;
      emit?.({ type: 'node:state', nodeId: node.id, state: 'failed', log: message });
    }

    nodeResults.push({
      id: node.id, definition: def, state, branch, mr: mrUrl,
      validationGates, reviewGates,
      duration: Date.now() - startTime, logs, outputs: nodeOutputs.get(node.id) ?? {},
    });

    previousBranch = branch;
  }

  const overallStatus = nodeResults.some((n) => n.state === 'failed')
    ? 'failed'
    : nodeResults.some((n) => n.state === 'gated')
      ? 'gated'
      : 'success';

  emit?.({ type: 'workflow:done', status: overallStatus });

  return { workflow: workflow.name, nodes: nodeResults, status: overallStatus };
}

function collectDeclaredOutputs(
  def: NodeResult['definition'],
  resolvedInputs: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
  const outputs: Record<string, string | number | boolean> = {};
  if (!def.outputs) return outputs;

  for (const key of Object.keys(def.outputs)) {
    if (key in resolvedInputs) {
      outputs[key] = resolvedInputs[key];
    }
  }

  return outputs;
}
