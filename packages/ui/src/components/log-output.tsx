import { Box, Text } from 'ink';

interface LogOutputProps {
  logs: readonly string[];
  maxLines?: number;
  expanded?: boolean;
}

function colorForPrefix(line: string): { color: string; prefix: string; rest: string } {
  if (line.startsWith('[think]')) {
    return { color: 'blue', prefix: '[think]', rest: line.slice(7) };
  }
  if (line.startsWith('[tool]')) {
    return { color: 'magenta', prefix: '[tool]', rest: line.slice(6) };
  }
  if (line.startsWith('[result]')) {
    return { color: 'green', prefix: '[result]', rest: line.slice(8) };
  }
  if (line.startsWith('ERROR') || line.startsWith('error')) {
    return { color: 'red', prefix: '', rest: line };
  }
  if (line.startsWith('>')) {
    return { color: 'cyan', prefix: '>', rest: line.slice(1) };
  }
  return { color: 'gray', prefix: '', rest: line };
}

export function LogOutput({ logs, maxLines = 20, expanded = false }: LogOutputProps) {
  const limit = expanded ? 100 : maxLines;
  const visible = logs.slice(-limit);

  return (
    <Box flexDirection="column" paddingX={1}>
      {!expanded && <Text bold>Logs</Text>}
      {!expanded && <Text> </Text>}
      {visible.length === 0 && <Text color="gray">No output yet</Text>}
      {visible.map((line, i) => {
        const { color, prefix, rest } = colorForPrefix(line);
        return (
          <Box key={i}>
            {prefix ? (
              <>
                <Text color={color} bold>{prefix}</Text>
                <Text color={color}>{rest}</Text>
              </>
            ) : (
              <Text color={color} wrap="truncate">{rest}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
