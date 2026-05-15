import { Box, Text } from 'ink';
import type { NodeInfo } from '../types.js';

const STATUS_ICONS: Record<string, string> = {
  pending: 'o',
  running: '~',
  success: '+',
  failed: 'x',
  skipped: '-',
  gated: '!',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'gray',
  running: 'yellow',
  success: 'green',
  failed: 'red',
  skipped: 'gray',
  gated: 'yellow',
};

interface NodeListProps {
  nodes: readonly NodeInfo[];
  selectedIndex: number;
}

export function NodeList({ nodes, selectedIndex }: NodeListProps) {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="gray">Nodes</Text>
      <Text> </Text>
      {nodes.map((node, i) => {
        const selected = i === selectedIndex;
        const icon = STATUS_ICONS[node.status] ?? '?';
        const color = STATUS_COLORS[node.status] ?? 'gray';
        const isLast = i === nodes.length - 1;

        return (
          <Box key={node.id} flexDirection="column">
            <Box>
              <Text color={selected ? 'cyan' : undefined} bold={selected}>
                {selected ? '>' : ' '}
              </Text>
              <Text color={color}>{icon}</Text>
              <Text> </Text>
              <Text color={selected ? 'white' : 'gray'} bold={selected}>
                {node.id}
              </Text>
            </Box>
            {!isLast && (
              <Box>
                <Text>  </Text>
                <Text color="gray">|</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
