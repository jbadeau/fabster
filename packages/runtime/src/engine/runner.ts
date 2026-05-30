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
import { enterSandbox, exitSandbox } from './sandbox.js';

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

export async function runWorkflow(
  workflow: WorkflowDefinition,
  options: RunOptions,
): Promise<RunResult> {
  const nodes = extractNodes(workflow);
  const repoCwd = workflow.workspace.root;
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

  // Check if any dependency failed (node should be skipped)
  function hasFailed(nodeId: string): boolean {
    const deps = dependencyMap.get(nodeId) ?? [];
    return deps.some((d) => failed.has(d));
  }

  // Track the previous branch for linear chaining
  let previousBranch = 'main';

  // Execute a single node
  async function executeOneNode(node: typeof nodes[number], baseBranch: string, retryEvidence?: string): Promise<void> {
    const startTime = Date.now();
    const def = node.definition;
    const branch = `fabster/${workflow.name}/${node.id}`;
    const logs: string[] = [];
    let state: NodeState = 'pending';
    let mrUrl: string | undefined;
    let validationGates: GateResult[] = [];
    let reviewGates: GateResult[] = [];

    const log = (message: string) => {
      logs.push(message);
      emit?.({ type: 'node:log', nodeId: node.id, message });
    };

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
        log(`Branch ${branch} already exists — skipping`);
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
      state = retryEvidence ? 'retrying' : 'executing';
      if (emit) {
        emit({ type: 'node:state', nodeId: node.id, state });
      } else {
        console.log(`  ⟳ ${node.id} [${state}] ${def.kind}: ${def.name}`);
      }
      log(`[${state}] ${def.kind}: ${def.name}`);

      const worktree = await createWorktree(repoCwd, workflow.name, node.id, baseBranch);
      log(`Created worktree: ${worktree.worktreePath} (branch: ${worktree.branch})`);
      const worktreeCwd = worktree.worktreePath;

      const tools = def.permissions?.tools ?? [];
      if (tools.length > 0) {
        log(`Provisioning tools: ${tools.join(', ')}`);
        await provisionTools(tools, worktreeCwd);
      }

      try {
        // Enter sandbox — all child processes spawned during executeNode
        // will be wrapped with nono using the node's declared permissions
        await enterSandbox(def.permissions);

        const execResult = await executeNode(node, resolvedInputs, options.agents, options.models, worktreeCwd, emit ? (msg) => emit({ type: 'node:log', nodeId: node.id, message: msg }) : undefined, retryEvidence);
        logs.push(...execResult.logs);
        nodeOutputs.set(node.id, execResult.outputs);

        if (execResult.resolvedAgent) {
          emit?.({ type: 'node:agent', nodeId: node.id, agentName: execResult.resolvedAgent });
        }

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
          log(`[validating] Running ${validation.length} gate(s)`);
          validationGates = await runValidationGates(validation, worktreeCwd);

          for (const g of validationGates) {
            log(`  ${g.passed ? '+' : 'x'} ${g.gate.kind}: ${g.detail}`);
            emit?.({ type: 'node:gate', nodeId: node.id, gate: g });
          }

          const failedGates = validationGates.filter((g) => !g.passed && g.gate.required !== false);
          if (failedGates.length > 0) {
            // Determine max retries across all failed gates
            const maxRetries = Math.max(...failedGates.map((g) => g.gate.maxRetries ?? 0));
            // Check current attempt from retry evidence pattern
            const currentAttempt = retryEvidence ? (parseInt(retryEvidence.match(/Attempt (\d+)/)?.[1] ?? '0', 10)) : 0;

            if (currentAttempt < maxRetries) {
              // Retry: collect evidence and re-execute
              const evidence = [
                `Attempt ${currentAttempt + 1} of ${maxRetries} failed.`,
                'Validation gate failures:',
                ...failedGates.map((g) => `- ${g.gate.kind}: ${g.detail ?? 'failed'}`),
              ].join('\n');

              emit?.({
                type: 'node:retry',
                nodeId: node.id,
                attempt: currentAttempt + 1,
                maxAttempts: maxRetries,
                evidence,
              });

              await removeWorktree(repoCwd, worktreeCwd);

              // Re-execute with evidence
              await executeOneNode(node, baseBranch, evidence);
              return;
            }

            state = 'failed';
            log('[failed] Validation gates did not pass');
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
          log(`[publishing] Committed: ${sha}`);
        } else {
          log('[publishing] No changes to commit');
        }

        try {
          const mr = await createMR(
            worktreeCwd, branch, baseBranch,
            `[fabster] ${def.name}`, def.purpose,
          );
          mrUrl = mr ?? undefined;
          if (mrUrl) {
            log(`[publishing] Created MR: ${mrUrl}`);
            emit?.({ type: 'node:mr', nodeId: node.id, mr: mrUrl });
          }
        } catch {
          log('[publishing] Skipped MR (no remote or gh not available)');
        }

        // === REVIEWING ===
        if (review.length > 0 && mrUrl) {
          state = 'reviewing';
          emit?.({ type: 'node:state', nodeId: node.id, state: 'reviewing' });
          log(`[reviewing] Checking ${review.length} review gate(s)`);
          reviewGates = await checkReviewGates(review, worktreeCwd, mrUrl);

          for (const g of reviewGates) {
            log(`  ${g.passed ? '+' : '?'} ${g.gate.kind}: ${g.detail}`);
            emit?.({ type: 'node:gate', nodeId: node.id, gate: g });
          }

          if (reviewGates.some((g) => !g.passed && g.gate.required !== false)) {
            state = 'gated';
            log('[gated] Waiting for human approval');
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
        log('[complete]');

        exitSandbox();
        await removeWorktree(repoCwd, worktreeCwd);

      } catch (err) {
        exitSandbox();
        await removeWorktree(repoCwd, worktreeCwd);
        throw err;
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`ERROR: ${message}`);
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

  // Sequential execution in topological order — stop on first failure
  for (const node of nodes) {
    // If any previous node failed, skip all remaining nodes
    if (failed.size > 0) {
      emit?.({ type: 'node:state', nodeId: node.id, state: 'skipped', log: 'Skipped — previous node failed' });
      nodeResults.set(node.id, {
        id: node.id, definition: node.definition, state: 'skipped', branch: '',
        validationGates: [], reviewGates: [],
        duration: 0, logs: ['Skipped — previous node failed'], outputs: {},
      });
      continue;
    }

    await executeOneNode(node, previousBranch);

    // After each node completes, update previousBranch to this node's branch
    const result = nodeResults.get(node.id);
    if (result && (result.state === 'complete' || result.state === 'gated') && result.branch) {
      previousBranch = result.branch;
    }
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
