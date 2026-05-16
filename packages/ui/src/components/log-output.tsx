import { Box, Text } from 'ink';

interface LogOutputProps {
  logs: readonly string[];
  maxLines?: number;
  expanded?: boolean;
}

function colorForLine(line: string): { color: string; dim: boolean } {
  if (line.startsWith('[tool]')) return { color: 'magenta', dim: false };
  if (line.startsWith('[text]')) return { color: 'white', dim: false };
  if (line.startsWith('[done]')) return { color: 'green', dim: false };
  if (line.startsWith('[think]')) return { color: 'blue', dim: false };
  if (line.startsWith('[result]')) return { color: 'green', dim: false };
  if (line.startsWith('[executing]')) return { color: 'yellow', dim: false };
  if (line.startsWith('[validating]')) return { color: 'cyan', dim: false };
  if (line.startsWith('[publishing]')) return { color: 'blue', dim: false };
  if (line.startsWith('[reviewing]')) return { color: 'yellow', dim: false };
  if (line.startsWith('[complete]')) return { color: 'green', dim: false };
  if (line.startsWith('[failed]') || line.startsWith('ERROR') || line.startsWith('error')) return { color: 'red', dim: false };
  if (line.startsWith('>')) return { color: 'cyan', dim: false };
  return { color: '', dim: true };
}

export function LogOutput({ logs, maxLines = 20, expanded = false }: LogOutputProps) {
  const limit = expanded ? 100 : maxLines;
  const visible = logs.slice(-limit);

  return (
    <Box flexDirection="column">
      {!expanded && <Text> </Text>}
      {visible.length === 0 && <Text dimColor>waiting...</Text>}
      {visible.map((line, i) => {
        const { color, dim } = colorForLine(line);
        return (
          <Text key={i} color={color || undefined} dimColor={dim} wrap="truncate">{line}</Text>
        );
      })}
    </Box>
  );
}
