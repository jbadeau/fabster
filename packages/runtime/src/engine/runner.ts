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

  const nodeResults = new Map<string, NodeResult>();
  const nodeOutputs = new Map<string, Record<string, string | number | boolean>>();
  const completed = new Set<string>();
  const failed = new Set<string>();

  // Build dependency map for quick lookup
  const dependencyMap = new Map<string, readonly string[]>();
  for (const node of nodes) {
    dependencyMap.set(node.id, node.dependsOn);
  }

  // Check if all dependencies of a node are satisfied
  function isReady(nodeId: string): boolean {
    const deps = dependencyMap.get(nodeId) ?? [];
    return deps.every((d) => completed.has(d));
  }

  // Check if any dependency failed (node should be skipped)
  function hasFailed(nodeId: string): boolean {
    const deps = dependencyMap.get(nodeId) ?? [];
    return deps.some((d) => failed.has(d));
  }

  // Find the branch to base this node's worktree on
  function findBaseBranch(nodeId: string): string {
    const deps = dependencyMap.get(nodeId) ?? [];
    if (deps.length === 0) return 'main';
    // Use the first dependency's branch as the base
    const depResult = nodeResults.get(deps[0]);
    return depResult?.branch || 'main';
  }

  // Execute a single node (extracted from the old loop body)
  async function executeOneNode(node: typeof nodes[number]): Promise<void> {
    const startTime = Date.now();
    const def = node.definition;
    const branch = `fabster/${workflow.name}/${node.id}`;
    const logs: string[] = [];
    let state: NodeState = 'pending';
    let mrUrl: string | undefined;
    let validationGates: GateResult[] = [];
    let reviewGates: GateResult[] = [];
    const baseBranch = findBaseBranch(node.id);

    if (hasFailed(node.id)) {
      emit?.({ type: 'node:state', nodeId: node.id, state: 'skipped', log: 'Skipped — dependency failed' });
      nodeResults.set(node.id, {
        id: node.id, definition: def, state: 'skipped', branch: '',
        validationGates: [], reviewGates: [],
        duration: 0, logs: ['Skipped — dependency failed'], outputs: {},
      });
      failed.add(node.id);
      return;
    }

    try {
      const resolvedInputs = resolveInputs(node.inputs, nodeOutputs);

      // Skip if branch already exists
      if (await branchExists(repoCwd, branch)) {
        const outputs = collectDeclaredOutputs(def, resolvedInputs);
        nodeOutputs.set(node.id, outputs);
        logs.push(`Branch ${branch} already exists — skipping`);
        emit?.({ type: 'node:state', nodeId: node.id, state: 'complete', log: `Branch ${branch} already exists — skipping` });
        nodeResults.set(node.id, {
          id: node.id, definition: def, state: 'complete', branch,
          validationGates: [], reviewGates: [],
          duration: Date.now() - startTime, logs, outputs,
        });
        completed.add(node.id);
        return;
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

      const worktree = await createWorktree(repoCwd, workflow.name, node.id, baseBranch);
      logs.push(`Created worktree: ${worktree.worktreePath} (branch: ${worktree.branch})`);
      const worktreeCwd = worktree.worktreePath;

      const tools = def.permissions?.tools ?? [];
      if (tools.length > 0) {
        const toolLog = `Provisioning tools: ${tools.join(', ')}`;
        logs.push(toolLog);
        emit?.({ type: 'node:log', nodeId: node.id, message: toolLog });
        await provisionTools(tools, worktreeCwd);
      }

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
          emit?.({ type: 'node:state', nodeId: node.id, state: 'failed', log: 'Execution failed' });
          nodeResults.set(node.id, {
            id: node.id, definition: def, state, branch,
            validationGates: [], reviewGates: [],
            duration: Date.now() - startTime, logs, outputs: execResult.outputs,
          });
          failed.add(node.id);
          await removeWorktree(repoCwd, worktreeCwd);
          return;
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

          if (validationGates.some((g) => !g.passed && g.gate.required !== false)) {
            state = 'failed';
            logs.push('[failed] Validation gates did not pass');
            emit?.({ type: 'node:state', nodeId: node.id, state: 'failed', log: 'Validation gates did not pass' });
            nodeResults.set(node.id, {
              id: node.id, definition: def, state, branch,
              validationGates, reviewGates: [],
              duration: Date.now() - startTime, logs, outputs: execResult.outputs,
            });
            failed.add(node.id);
            await removeWorktree(repoCwd, worktreeCwd);
            return;
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
            worktreeCwd, branch, baseBranch,
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

          if (reviewGates.some((g) => !g.passed && g.gate.required !== false)) {
            state = 'gated';
            logs.push('[gated] Waiting for human approval');
            emit?.({ type: 'node:state', nodeId: node.id, state: 'gated', log: 'Waiting for human approval' });
            nodeResults.set(node.id, {
              id: node.id, definition: def, state, branch, mr: mrUrl,
              validationGates, reviewGates,
              duration: Date.now() - startTime, logs, outputs: nodeOutputs.get(node.id) ?? {},
            });
            completed.add(node.id); // gated counts as "done" for dependency purposes
            await removeWorktree(repoCwd, worktreeCwd);
            return;
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
      emit?.({ type: 'node:state', nodeId: node.id, state: 'failed', log: message });
    }

    if (!nodeResults.has(node.id)) {
      nodeResults.set(node.id, {
        id: node.id, definition: def, state, branch, mr: mrUrl,
        validationGates, reviewGates,
        duration: Date.now() - startTime, logs, outputs: nodeOutputs.get(node.id) ?? {},
      });
    }

    if (state === 'complete') {
      completed.add(node.id);
    } else if (state === 'failed') {
      failed.add(node.id);
    }
  }

  // Parallel execution: process nodes in waves based on dependency readiness
  const remaining = new Set(nodes.map((n) => n.id));

  while (remaining.size > 0) {
    // Find all nodes whose dependencies are satisfied
    const ready = nodes.filter((n) => remaining.has(n.id) && isReady(n.id));

    if (ready.length === 0) {
      // No nodes are ready — remaining nodes have unsatisfied deps (failed upstream)
      for (const nodeId of remaining) {
        const node = nodes.find((n) => n.id === nodeId)!;
        emit?.({ type: 'node:state', nodeId, state: 'skipped', log: 'Skipped — dependency failed' });
        nodeResults.set(nodeId, {
          id: nodeId, definition: node.definition, state: 'skipped', branch: '',
          validationGates: [], reviewGates: [],
          duration: 0, logs: ['Skipped — dependency failed'], outputs: {},
        });
      }
      break;
    }

    // Execute all ready nodes in parallel
    await Promise.all(ready.map((node) => {
      remaining.delete(node.id);
      return executeOneNode(node);
    }));
  }

  // Collect results in original node order
  const orderedResults = nodes.map((n) => nodeResults.get(n.id)!).filter(Boolean);

  const overallStatus = orderedResults.some((n) => n.state === 'failed')
    ? 'failed'
    : orderedResults.some((n) => n.state === 'gated')
      ? 'gated'
      : 'success';

  emit?.({ type: 'workflow:done', status: overallStatus });

  return { workflow: workflow.name, nodes: orderedResults, status: overallStatus };
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
