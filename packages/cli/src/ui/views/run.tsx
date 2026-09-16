import { useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import {
  runWorkflow,
  extractNodes,
  createWorkflowEmitter,
} from '@fabster/runtime';
import type { NodeState, WorkflowEvent } from '@fabster/runtime';
import { Banner, NodeStatusIcon, Spinner, useKeys } from '../components.js';
import { loadWorkflowModule } from '../../workflow-loader.js';

interface RunNode {
  id: string;
  name: string;
  kind: string;
  state: NodeState;
  agent?: string;
  logs: string[];
}

type Phase = 'loading' | 'running' | 'done' | 'error';

export function RunView({
  file,
  dryRun,
  onExit,
}: {
  file: string;
  dryRun: boolean;
  onExit?: () => void;
}) {
  const app = useApp();
  const [phase, setPhase] = useState<Phase>('loading');
  const [workflowName, setWorkflowName] = useState('');
  const [agentCount, setAgentCount] = useState(0);
  const [nodes, setNodes] = useState<RunNode[]>([]);
  const [status, setStatus] = useState<'success' | 'failed' | 'gated' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useKeys((input, key) => {
    if ((phase === 'done' || phase === 'error') && (key.return || input === 'q')) {
      onExit ? onExit() : app.exit();
    }
  });

  // In a non-interactive shell there's no keypress coming — exit on completion.
  useEffect(() => {
    if ((phase === 'done' || phase === 'error') && !process.stdin.isTTY) {
      app.exit();
    }
  }, [phase, app]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let loaded;
      try {
        loaded = await loadWorkflowModule(file);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setPhase('error');
          process.exitCode = 1;
        }
        return;
      }
      if (cancelled) return;

      const { workflow, agents } = loaded;
      setWorkflowName(workflow.name);
      setAgentCount(agents.length);

      const resolved = extractNodes(workflow);
      setNodes(
        resolved.map((n) => ({
          id: n.id,
          name: n.definition.name,
          kind: n.definition.kind,
          state: 'pending' as NodeState,
          logs: [],
        })),
      );
      setPhase('running');

      const emitter = createWorkflowEmitter();
      emitter.on('progress', (event: WorkflowEvent) => {
        if (cancelled) return;
        setNodes((prev) =>
          prev.map((node) => {
            if ('nodeId' in event && event.nodeId !== node.id) return node;
            switch (event.type) {
              case 'node:state':
                return { ...node, state: event.state };
              case 'node:agent':
                return { ...node, agent: event.agentName };
              case 'node:log':
                return { ...node, logs: [...node.logs, event.message] };
              default:
                return node;
            }
          }),
        );
      });

      try {
        const result = await runWorkflow(workflow, { agents, dryRun, emitter });
        if (cancelled) return;
        setStatus(result.status);
        setPhase('done');
        if (result.status === 'failed') process.exitCode = 1;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setPhase('error');
        process.exitCode = 1;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, dryRun]);

  if (phase === 'loading') {
    return (
      <Box flexDirection="column">
        <Banner />
        <Text>
          <Spinner /> Loading <Text color="cyan">{file}</Text>…
        </Text>
      </Box>
    );
  }

  if (phase === 'error') {
    return (
      <Box flexDirection="column">
        <Banner />
        <Text color="red">✖ {error}</Text>
        <Text dimColor>Press q to exit.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Banner
        subtitle={`${workflowName}   agents: ${agentCount}${dryRun ? '   (dry run)' : ''}`}
      />
      <Box flexDirection="column">
        {nodes.map((node) => (
          <Box key={node.id} flexDirection="column">
            <Text>
              <NodeStatusIcon state={node.state} />{' '}
              <Text>{node.name}</Text> <Text dimColor>{`[${node.kind}]`}</Text>
              {node.agent ? <Text dimColor>{`  ${node.agent}`}</Text> : null}
              <Text dimColor>{`  ${node.state}`}</Text>
            </Text>
            {node.state === 'failed' &&
              node.logs.slice(-3).map((log, i) => (
                <Text key={i} color="red" dimColor>
                  {`    ${log}`}
                </Text>
              ))}
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        {phase === 'running' ? (
          <Text>
            <Spinner /> Running…
          </Text>
        ) : (
          <Text
            color={status === 'success' ? 'green' : status === 'gated' ? 'yellow' : 'red'}
          >
            {status === 'success' ? '✔' : status === 'gated' ? '⏸' : '✖'} Workflow{' '}
            {status}. <Text dimColor>Press q to exit.</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}
