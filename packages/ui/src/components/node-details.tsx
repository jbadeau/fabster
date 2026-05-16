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
      <Box flexDirection="column">
        <Text dimColor>Select a node</Text>
      </Box>
    );
  }

  const allGates = [...node.validationGates, ...node.reviewGates];

  return (
    <Box flexDirection="column">
      <Text bold>{node.id}</Text>
      <Text dimColor>{node.type === 'task' ? 'task' : 'command'}  {'\u00b7'}  <Text color={stateColor(node.state)}>{node.state}</Text></Text>
      {node.duration > 0 && <Text dimColor>{formatDuration(node.duration)}</Text>}

      {node.type === 'task' && node.agent && (
        <Text dimColor>agent: {node.agent}</Text>
      )}
      {node.type === 'task' && (
        <Text dimColor>reasoning: {node.reasoning ?? 'medium'}</Text>
      )}

      {Object.keys(node.inputs).length > 0 && (
        <>
          <Text> </Text>
          {Object.entries(node.inputs).map(([k, v]) => (
            <Text key={k} dimColor>{k}: <Text>{String(v)}</Text></Text>
          ))}
        </>
      )}

      {allGates.length > 0 && (
        <>
          <Text> </Text>
          {allGates.map((g, i) => (
            <Box key={i}>
              <Text color={gateColor(g)}>{gateIcon(g)} </Text>
              <Text dimColor>{g.kind}</Text>
            </Box>
          ))}
        </>
      )}

      {node.state === 'failed' && node.errors.length > 0 && (
        <>
          <Text> </Text>
          {node.errors.slice(0, 5).map((line, i) => (
            <Text key={i} color="red">{line}</Text>
          ))}
        </>
      )}

      {node.state === 'gated' && (
        <>
          <Text> </Text>
          <Text color="yellow">Awaiting approval</Text>
          {node.mr && <Text color="cyan">{node.mr}</Text>}
        </>
      )}

      {(node.mr || node.branch) && (
        <>
          <Text> </Text>
          {node.mr && <Text color="cyan">{node.mr}</Text>}
          {node.branch && <Text dimColor>{node.branch}</Text>}
        </>
      )}
    </Box>
  );
}

function SummaryView({ nodes }: { nodes: readonly NodeInfo[] }) {
  const totalDuration = nodes.reduce((sum, n) => sum + n.duration, 0);
  const completedCount = nodes.filter((n) => n.state === 'complete').length;

  return (
    <Box flexDirection="column">
      <Text bold>Summary</Text>
      <Text dimColor>{completedCount}/{nodes.length} complete  {'\u00b7'}  {formatDuration(totalDuration)}</Text>

      <Text> </Text>
      <Text bold dimColor>MR Stack</Text>
      {nodes.map((n) => (
        <Box key={n.id}>
          <Text color={n.state === 'complete' ? 'green' : 'red'}>{n.state === 'complete' ? '\u2713' : '\u2717'} </Text>
          <Text dimColor>{n.id} </Text>
          <Text color="cyan">{n.mr ?? '\u2500'}</Text>
        </Box>
      ))}

      <Text> </Text>
      {nodes.every((n) => n.state === 'complete') && (
        <Text color="green">{'\u2713'} Ready to merge</Text>
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
  if (g.passed) return '\u2713';
  if (g.kind === 'humanApproved') return '\u25cb';
  return '\u2717';
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
