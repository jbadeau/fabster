import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { WorkflowInfo } from '../types.js';
import { NodeList } from './node-list.js';
import { NodeDetails } from './node-details.js';
import { LogOutput } from './log-output.js';

interface AppProps {
  workflow: WorkflowInfo;
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  running: { text: '~ running', color: 'yellow' },
  success: { text: '+ complete', color: 'green' },
  failed: { text: 'x failed', color: 'red' },
  gated: { text: '? waiting', color: 'yellow' },
};

const SEPARATOR = '\u2500'.repeat(85);

export function App({ workflow }: AppProps) {
  const { name, status, elapsed, nodes } = workflow;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useInput((input, key) => {
    if (expanded) {
      if (key.escape || input === 'q') {
        setExpanded(false);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(nodes.length - 1, i + 1));
    }
    if (key.return || input === 'l') {
      setExpanded(true);
    }
  });

  const selectedNode = nodes[selectedIndex] ?? null;
  const completedCount = nodes.filter(
    (n) => n.status === 'success' || n.status === 'gated',
  ).length;
  const statusInfo = STATUS_LABELS[status] ?? { text: status, color: 'gray' };
  const workflowComplete = status === 'success';

  // Expanded log view
  if (expanded && selectedNode) {
    return (
      <Box flexDirection="column" width="100%">
        <Box paddingX={1} justifyContent="space-between">
          <Box>
            <Text bold>fabster</Text>
            <Text>  </Text>
            <Text>{name}</Text>
            <Text>  ·  </Text>
            <Text bold>{selectedNode.id}</Text>
          </Box>
          <Text color="gray">[ESC to back]</Text>
        </Box>

        <Box paddingX={1}>
          <Text color="gray">{SEPARATOR}</Text>
        </Box>

        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          <LogOutput logs={selectedNode.logs} expanded />
        </Box>

        <Box paddingX={1}>
          <Text color="gray">{SEPARATOR}</Text>
        </Box>

        <Box paddingX={1}>
          <Text color="gray">{'\u2191\u2193'} scroll  ·  ESC back to dashboard  ·  / search</Text>
        </Box>
      </Box>
    );
  }

  // Standard 3-column dashboard
  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Box paddingX={1} justifyContent="space-between">
        <Box>
          <Text bold>fabster</Text>
          <Text>  </Text>
          <Text>{name}</Text>
        </Box>
        <Text color={statusInfo.color}>{statusInfo.text}</Text>
      </Box>

      <Box paddingX={1}>
        <Text color="gray">{SEPARATOR}</Text>
      </Box>

      {/* Three column layout */}
      <Box minHeight={16}>
        {/* Left: Node list */}
        <Box flexDirection="column" width={24} borderStyle="single" borderColor="gray">
          <NodeList nodes={nodes} selectedIndex={selectedIndex} />
        </Box>

        {/* Center: Details */}
        <Box flexDirection="column" width={32} borderStyle="single" borderColor="gray">
          <NodeDetails
            node={selectedNode}
            allNodes={nodes}
            workflowComplete={workflowComplete}
          />
        </Box>

        {/* Right: Logs */}
        <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor="gray">
          <LogOutput logs={selectedNode?.logs ?? []} />
        </Box>
      </Box>

      {/* Footer */}
      <Box paddingX={1}>
        <Text color="gray">{SEPARATOR}</Text>
      </Box>

      <Box paddingX={1}>
        <Text>{completedCount}/{nodes.length} complete</Text>
        <Text>  ·  </Text>
        <Text>elapsed {formatDuration(elapsed)}</Text>
        {status === 'gated' && selectedNode?.mr && (
          <>
            <Text>  ·  </Text>
            <Text color="yellow">waiting on approval  ·  {selectedNode.mr}</Text>
          </>
        )}
        {status === 'success' && (
          <>
            <Text>  ·  </Text>
            <Text color="green">{nodes.length} stacked MRs  ·  ready to merge</Text>
          </>
        )}
      </Box>

      <Box paddingX={1}>
        <Text color="gray">
          {'\u2191\u2193'} navigate  ·  enter expand logs  ·  r retry  ·  q quit
          {workflowComplete ? '  ·  m merge all' : ''}
        </Text>
      </Box>
    </Box>
  );
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}:${String(remainSecs).padStart(2, '0')}`;
}
