import { useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Banner, useKeys } from '../components.js';

const ROWS: Array<[string, string]> = [
  ['fabster', 'Open the interactive TUI (menu)'],
  ['fabster run <file>', 'Run a workflow with live progress'],
  ['fabster init', 'Install MCP servers, skills, and agent context'],
  ['fabster daemon', 'Start the daemon + dashboard'],
  ['fabster catalog', 'Browse tasks, commands, skills, and rules'],
  ['fabster help', 'Show this help'],
];

const FLAGS: Array<[string, string]> = [
  ['--port <port>', 'Daemon port (default 3456)'],
  ['--no-open', "Don't open the browser (daemon)"],
  ['--dry-run', 'Validate without executing (run)'],
  ['--yes', 'Apply without confirmation (init)'],
];

export function HelpView({ onExit }: { onExit?: () => void }) {
  const app = useApp();
  useKeys((input, key) => {
    if (input === 'q' || key.escape || key.return) onExit ? onExit() : app.exit();
  });
  useEffect(() => {
    if (!process.stdin.isTTY) app.exit();
  }, [app]);

  return (
    <Box flexDirection="column">
      <Banner subtitle="usage" />
      <Box flexDirection="column" marginBottom={1}>
        {ROWS.map(([cmd, desc]) => (
          <Text key={cmd}>
            <Text color="cyan">{cmd.padEnd(22)}</Text>
            <Text dimColor>{desc}</Text>
          </Text>
        ))}
      </Box>
      <Text bold>Options</Text>
      <Box flexDirection="column">
        {FLAGS.map(([flag, desc]) => (
          <Text key={flag}>
            <Text color="cyan">{flag.padEnd(22)}</Text>
            <Text dimColor>{desc}</Text>
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press q to exit.</Text>
      </Box>
    </Box>
  );
}
