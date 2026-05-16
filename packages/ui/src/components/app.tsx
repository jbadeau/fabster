import { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { WorkflowInfo } from '../types.js';
import { NodeList } from './node-list.js';
import { LogOutput } from './log-output.js';

interface AppProps {
  workflow: WorkflowInfo;
}

const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  running: { icon: '\u25cf', color: 'yellow' },
  success: { icon: '\u2713', color: 'green' },
  failed: { icon: '\u2717', color: 'red' },
  gated: { icon: '\u25cb', color: 'yellow' },
};

export function App({ workflow }: AppProps) {
  const { name, status, elapsed, nodes } = workflow;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const { stdout } = useStdout();
  const cols = stdout?.columns ?? 120;

  useInput((input, key) => {
    if (expanded) {
      if (key.escape || input === 'q') {
        setExpanded(false);
      }
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }
    if (key.downArrow || input === 'j') {
      setSelectedIndex((i) => Math.min(nodes.length - 1, i + 1));
    }
    if (key.return || input === 'l') {
      setExpanded(true);
    }
  });

  const selectedNode = nodes[selectedIndex] ?? null;
  const completedCount = nodes.filter(
    (n) => n.state === 'complete' || n.state === 'gated',
  ).length;
  const statusInfo = STATUS_ICONS[status] ?? { icon: '?', color: 'gray' };
  const workflowComplete = status === 'success';
  const sep = '\u2500'.repeat(Math.max(cols - 4, 40));

  // Expanded log view
  if (expanded && selectedNode) {
    return (
      <Box flexDirection="column" width="100%">
        <Box paddingX={1} justifyContent="space-between">
          <Box>
            <Text bold color="cyan">fabster</Text>
            <Text dimColor> {'\u203a'} </Text>
            <Text>{name}</Text>
            <Text dimColor> {'\u203a'} </Text>
            <Text bold>{selectedNode.id}</Text>
          </Box>
          <Text dimColor>esc back</Text>
        </Box>

        <Box paddingX={1}>
          <Text dimColor>{sep}</Text>
        </Box>

        <Box flexDirection="column" flexGrow={1} paddingX={2}>
          <LogOutput logs={selectedNode.logs} expanded />
        </Box>

        <Box paddingX={1}>
          <Text dimColor>{sep}</Text>
        </Box>

        <Box paddingX={1}>
          <Text dimColor>esc back  {'\u00b7'}  q quit</Text>
        </Box>
      </Box>
    );
  }

  // Two-panel layout
  const sidebarWidth = Math.max(30, Math.min(44, Math.floor(cols * 0.30)));

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Box paddingX={1} justifyContent="space-between">
        <Box>
          <Text bold color="cyan">fabster</Text>
          <Text dimColor> {'\u203a'} </Text>
          <Text bold>{name}</Text>
        </Box>
        <Box>
          <Text color={statusInfo.color}>{statusInfo.icon} {status}</Text>
          <Text dimColor>  {formatDuration(elapsed)}</Text>
        </Box>
      </Box>

      <Box paddingX={1}>
        <Text dimColor>{sep}</Text>
      </Box>

      {/* Two-panel layout */}
      <Box minHeight={16}>
        {/* Left: Node list with inline details */}
        <Box flexDirection="column" width={sidebarWidth} paddingX={1}>
          <NodeList nodes={nodes} selectedIndex={selectedIndex} />
        </Box>

        {/* Right: Logs */}
        <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor="gray" borderRight={false} borderTop={false} borderBottom={false} paddingLeft={1}>
          <LogOutput logs={selectedNode?.logs ?? []} />
        </Box>
      </Box>

      {/* Footer */}
      <Box paddingX={1}>
        <Text dimColor>{sep}</Text>
      </Box>

      <Box paddingX={1} justifyContent="space-between">
        <Box>
          <Text>{completedCount}</Text>
          <Text dimColor>/</Text>
          <Text>{nodes.length}</Text>
          {selectedNode && (
            <>
              <Text dimColor>  {'\u00b7'}  </Text>
              <Text dimColor>&gt;</Text>
              <Text bold>{selectedNode.id}</Text>
              <Text dimColor> {selectedNode.state}</Text>
            </>
          )}
          {status === 'gated' && selectedNode?.mr && (
            <>
              <Text dimColor>  {'\u00b7'}  </Text>
              <Text color="yellow">awaiting approval</Text>
            </>
          )}
          {status === 'success' && (
            <>
              <Text dimColor>  {'\u00b7'}  </Text>
              <Text color="green">{nodes.length} stacked MRs ready</Text>
            </>
          )}
        </Box>
        <Text dimColor>
          j/k navigate  {'\u00b7'}  enter logs  {'\u00b7'}  q quit
          {workflowComplete ? `  ${'\u00b7'}  m merge` : ''}
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
