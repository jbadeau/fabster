import { Box, Text } from 'ink';
import type { GateInfo, NodeInfo } from '../types.js';

interface NodeDetailsProps {
  node: NodeInfo | null;
  allNodes: readonly NodeInfo[];
  workflowComplete: boolean;
}

export function NodeDetails({ node, allNodes, workflowComplete }: NodeDetailsProps) {
  if (workflowComplete && !node) {
    return <SummaryView nodes={allNodes} />;
  }

  if (!node) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="gray">Select a node</Text>
      </Box>
    );
  }

  const allGates = [...node.validationGates, ...node.reviewGates];

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>{node.id}</Text>
      <Text> </Text>

      <Text>{'State:   '}<Text color={stateColor(node.state)}>{node.state}</Text></Text>
      <Text>{'Type:    '}<Text>{node.type === 'task' ? 'task (agentic)' : 'command'}</Text></Text>

      {node.type === 'task' && node.agent && (
        <Text>{'Agent:   '}<Text>{node.agent}</Text></Text>
      )}
      {node.type === 'task' && (
        <Text>{'Model:   '}<Text>{node.reasoning ?? 'medium'}</Text></Text>
      )}
      {node.duration > 0 && (
        <Text>{'Time:    '}<Text>{formatDuration(node.duration)}</Text></Text>
      )}

      <Text> </Text>
      <Text bold>Inputs:</Text>
      {Object.keys(node.inputs).length === 0 && <Text color="gray">  none</Text>}
      {Object.entries(node.inputs).map(([k, v]) => (
        <Text key={k}>  {k}: {String(v)}</Text>
      ))}

      {/* Validation gates */}
      {node.validationGates.length > 0 && (
        <>
          <Text> </Text>
          <Text bold>Validation:</Text>
          <GatePipeline gates={node.validationGates} />
        </>
      )}

      {/* Review gates */}
      {node.reviewGates.length > 0 && (
        <>
          <Text> </Text>
          <Text bold>Review:</Text>
          <GatePipeline gates={node.reviewGates} />
        </>
      )}

      {allGates.length === 0 && (
        <>
          <Text> </Text>
          <Text bold>Gates:</Text>
          <Text color="gray">  none</Text>
        </>
      )}

      {node.state === 'failed' && node.errors.length > 0 && (
        <>
          <Text> </Text>
          <Text bold color="red">Errors:</Text>
          {node.errors.slice(0, 5).map((line, i) => (
            <Text key={i} color="red">  {line}</Text>
          ))}
        </>
      )}

      {node.state === 'gated' && (
        <>
          <Text> </Text>
          <Text color="yellow">Waiting for human approval</Text>
          {node.mr && <Text color="yellow">on {node.mr}</Text>}
        </>
      )}

      <Text> </Text>
      {node.mr && <Text>{'MR:      '}<Text color="cyan">{node.mr}</Text></Text>}
      {node.branch && <Text>{'Branch:  '}<Text color="gray">{node.branch}</Text></Text>}
    </Box>
  );
}

function GatePipeline({ gates }: { gates: readonly GateInfo[] }) {
  return (
    <Box>
      <Text>  </Text>
      {gates.map((g, i) => (
        <Box key={i}>
          <Text color={gateColor(g)}>
            [{gateIcon(g)} {g.kind}]
          </Text>
          {i < gates.length - 1 && <Text color="gray">{'\u2192'}</Text>}
        </Box>
      ))}
    </Box>
  );
}

function SummaryView({ nodes }: { nodes: readonly NodeInfo[] }) {
  const totalDuration = nodes.reduce((sum, n) => sum + n.duration, 0);
  const completedCount = nodes.filter((n) => n.state === 'complete').length;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>Summary</Text>
      <Text> </Text>
      <Text>{'Nodes:   '}{completedCount}/{nodes.length} complete</Text>
      <Text>{'Total:   '}{formatDuration(totalDuration)}</Text>
      <Text> </Text>
      <Text bold>MR Stack:</Text>
      <Text> </Text>
      {nodes.map((n, i) => (
        <Box key={n.id} flexDirection="column">
          <Box>
            <Text color="cyan">{n.mr ?? '(no MR)'}</Text>
            <Text> {n.id} </Text>
            <Text color={n.state === 'complete' ? 'green' : 'red'}>
              {n.state === 'complete' ? '+' : 'x'}
            </Text>
          </Box>
          {i < nodes.length - 1 && (
            <Text color="gray">{'  <- '}{n.branch ?? 'main'}</Text>
          )}
        </Box>
      ))}
      <Text> </Text>
      {nodes.every((n) => n.state === 'complete') && (
        <>
          <Text color="green">All gates passed</Text>
          <Text color="green">Ready to merge in order</Text>
        </>
      )}
    </Box>
  );
}

function gateColor(g: GateInfo): string {
  if (g.passed) return 'green';
  if (g.kind === 'humanApproved') return 'yellow';
  return 'red';
}

function gateIcon(g: GateInfo): string {
  if (g.passed) return '+';
  if (g.kind === 'humanApproved') return '?';
  return 'x';
}

function stateColor(state: string): string {
  const map: Record<string, string> = {
    complete: 'green', failed: 'red', executing: 'yellow',
    validating: 'cyan', publishing: 'blue', reviewing: 'yellow',
    gated: 'yellow', skipped: 'gray', pending: 'gray',
  };
  return map[state] ?? 'gray';
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}:${String(remainSecs).padStart(2, '0')}`;
}
