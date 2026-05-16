import { Box, Text } from 'ink';
import type { NodeInfo } from '../types.js';

const STATE_ICONS: Record<string, string> = {
  pending: '\u25cb',     // ○
  executing: '\u25cf',   // ●
  validating: '\u25cf',  // ●
  publishing: '\u25cf',  // ●
  reviewing: '\u25cb',   // ○
  complete: '\u2713',    // ✓
  failed: '\u2717',      // ✗
  skipped: '\u2500',     // ─
  gated: '\u25cb',       // ○
};

const STATE_COLORS: Record<string, string> = {
  pending: 'gray',
  executing: 'yellow',
  validating: 'yellow',
  publishing: 'yellow',
  reviewing: 'yellow',
  complete: 'green',
  failed: 'red',
  skipped: 'gray',
  gated: 'yellow',
};

interface NodeListProps {
  nodes: readonly NodeInfo[];
  selectedIndex: number;
}

export function NodeList({ nodes, selectedIndex }: NodeListProps) {
  const selectedNode = nodes[selectedIndex] ?? null;

  return (
    <Box flexDirection="column">
      {/* Empty line for top breathing room */}
      <Text> </Text>

      {/* Node rows */}
      {nodes.map((node, i) => {
        const selected = i === selectedIndex;
        const icon = STATE_ICONS[node.state] ?? '?';
        const color = STATE_COLORS[node.state] ?? 'gray';
        const dur = node.duration > 0 ? formatDuration(node.duration) : '';

        return (
          <Box key={node.id}>
            <Text color={selected ? 'cyan' : 'gray'}>{selected ? '>' : ' '}</Text>
            <Text color={color}>{icon} </Text>
            <Text color={selected ? 'white' : undefined} bold={selected} dimColor={!selected}>
              {node.id}
            </Text>
            {dur && <Text dimColor>{'  '}{dur}</Text>}
          </Box>
        );
      })}

      {/* Inline details for selected node, below the list */}
      {selectedNode && <SelectedDetails node={selectedNode} />}
    </Box>
  );
}

function SelectedDetails({ node }: { node: NodeInfo }) {
  const hasGates = node.validationGates.length > 0 || node.reviewGates.length > 0;
  const hasInfo = node.type === 'task' || hasGates || node.mr || node.errors.length > 0;

  if (!hasInfo) return null;

  return (
    <Box flexDirection="column" paddingLeft={1} marginTop={1}>
      {/* Type + agent */}
      {node.type === 'task' && (
        <Text dimColor>
          {node.agent ? `agent: ${node.agent}` : 'task'}
          {node.reasoning ? ` \u00b7 ${node.reasoning}` : ''}
        </Text>
      )}

      {/* Gates inline */}
      {hasGates && (
        <Box>
          {[...node.validationGates, ...node.reviewGates].map((g, i) => (
            <Text key={`${node.id}-gate-${g.kind}-${i}`}>
              <Text color={g.passed ? 'green' : g.kind === 'humanApproved' ? 'yellow' : 'red'}>
                {g.passed ? '\u2713' : g.kind === 'humanApproved' ? '\u25cb' : '\u2717'}
              </Text>
              <Text dimColor> {g.kind}  </Text>
            </Text>
          ))}
        </Box>
      )}

      {/* MR link */}
      {node.mr && <Text color="cyan">{node.mr}</Text>}

      {/* Errors */}
      {node.state === 'failed' && node.errors.length > 0 && (
        <Text color="red" wrap="truncate">{node.errors[0]}</Text>
      )}
    </Box>
  );
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}:${String(remainSecs).padStart(2, '0')}`;
}
