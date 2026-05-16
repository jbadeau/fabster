import { useState, useEffect } from 'react';
import { render } from 'ink';
import type { WorkflowDefinition, AgentDefinition, TaskDefinition } from '@fabster/core';
import {
  runWorkflow,
  extractNodes,
  createWorkflowEmitter,
} from '@fabster/runtime';
import type { ModelMap, WorkflowEvent, ResolvedNode } from '@fabster/runtime';
import { App } from '@fabster/ui';
import type { NodeInfo, WorkflowInfo, WorkflowStatus, GateInfo } from '@fabster/ui';

function buildInitialNodes(nodes: readonly ResolvedNode[]): NodeInfo[] {
  return nodes.map((n) => ({
    id: n.id,
    name: n.definition.name,
    type: n.definition.kind as 'command' | 'task',
    state: 'pending' as const,
    reasoning: n.definition.kind === 'task' ? (n.definition as TaskDefinition).reasoning : undefined,
    branch: '',
    duration: 0,
    validationGates: [],
    reviewGates: [],
    logs: [],
    inputs: Object.fromEntries(
      Object.entries(n.inputs).filter(
        ([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
      ),
    ) as Record<string, string | number | boolean>,
    errors: [],
  }));
}

interface TuiBridgeProps {
  workflow: WorkflowDefinition;
  agents: readonly AgentDefinition[];
  models: ModelMap;
  dryRun?: boolean;
}

function TuiBridge({ workflow, agents, models, dryRun }: TuiBridgeProps) {
  const nodes = extractNodes(workflow);
  const [workflowInfo, setWorkflowInfo] = useState<WorkflowInfo>({
    name: workflow.name,
    status: 'running',
    elapsed: 0,
    nodes: buildInitialNodes(nodes),
  });

  const [startTime] = useState(() => Date.now());

  // Elapsed time ticker
  useEffect(() => {
    if (workflowInfo.status !== 'running') return;
    const timer = setInterval(() => {
      setWorkflowInfo((prev) => ({ ...prev, elapsed: Date.now() - startTime }));
    }, 1000);
    return () => clearInterval(timer);
  }, [workflowInfo.status, startTime]);

  // Run workflow and subscribe to events
  useEffect(() => {
    const emitter = createWorkflowEmitter();

    const updateNode = (nodeId: string, updater: (node: NodeInfo) => NodeInfo) => {
      setWorkflowInfo((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? updater(n) : n)),
      }));
    };

    emitter.on('progress', (event: WorkflowEvent) => {
      switch (event.type) {
        case 'node:state':
          updateNode(event.nodeId, (n) => ({
            ...n,
            state: event.state,
            logs: event.log ? [...n.logs, event.log] : n.logs,
            errors: event.state === 'failed' && event.log ? [...n.errors, event.log] : n.errors,
          }));
          break;

        case 'node:log':
          updateNode(event.nodeId, (n) => ({
            ...n,
            logs: [...n.logs, event.message],
          }));
          break;

        case 'node:gate':
          updateNode(event.nodeId, (n) => {
            const gateInfo: GateInfo = {
              kind: event.gate.gate.kind,
              passed: event.gate.passed,
              detail: event.gate.detail,
            };
            // Determine if this is a validation or review gate
            const isReview = event.gate.gate.kind === 'humanApproved';
            return {
              ...n,
              validationGates: isReview ? n.validationGates : [...n.validationGates, gateInfo],
              reviewGates: isReview ? [...n.reviewGates, gateInfo] : n.reviewGates,
            };
          });
          break;

        case 'node:mr':
          updateNode(event.nodeId, (n) => ({
            ...n,
            mr: event.mr,
            branch: n.branch || `fabster/${workflow.name}/${n.id}`,
          }));
          break;

        case 'workflow:done':
          setWorkflowInfo((prev) => ({
            ...prev,
            status: event.status as WorkflowStatus,
            elapsed: Date.now() - startTime,
          }));
          break;
      }
    });

    runWorkflow(workflow, { agents, models, dryRun, emitter }).catch((err) => {
      setWorkflowInfo((prev) => ({
        ...prev,
        status: 'failed',
        elapsed: Date.now() - startTime,
      }));
      // Ensure error is visible in logs of currently executing node
      const activeNode = nodes.find((n) => true); // fallback
      if (activeNode) {
        const message = err instanceof Error ? err.message : String(err);
        emitter.emit('progress', { type: 'node:log', nodeId: activeNode.id, message: `ERROR: ${message}` });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <App workflow={workflowInfo} />;
}

export async function runWithTui(
  workflow: WorkflowDefinition,
  opts: { agents: readonly AgentDefinition[]; models: ModelMap; dryRun?: boolean },
): Promise<void> {
  const instance = render(
    <TuiBridge
      workflow={workflow}
      agents={opts.agents}
      models={opts.models}
      dryRun={opts.dryRun}
    />,
  );

  await instance.waitUntilExit();
}
