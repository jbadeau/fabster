import { useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import { startServer } from '@fabster/server';
import { Banner, Spinner, useKeys } from '../components.js';

export function DaemonView({
  port,
  open,
  onExit,
}: {
  port: number;
  open: boolean;
  onExit?: () => void;
}) {
  const app = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let handle: ReturnType<typeof startServer> | null = null;
    try {
      handle = startServer({ port, open });
      setUrl(handle.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
    return () => {
      handle?.close();
    };
  }, [port, open]);

  useKeys((input, key) => {
    if (input === 'q' || key.escape) {
      onExit ? onExit() : app.exit();
    }
  });

  if (error) {
    return (
      <Box flexDirection="column">
        <Banner subtitle="daemon" />
        <Text color="red">✖ {error}</Text>
        <Text dimColor>Press q to exit.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Banner subtitle="daemon" />
      {url ? (
        <Box flexDirection="column">
          <Text>
            <Text color="green">●</Text> daemon running
          </Text>
          <Text>
            {'  '}Dashboard: <Text color="cyan">{url}</Text>
          </Text>
          <Text>
            {'  '}API:       <Text color="cyan">{url}/trpc</Text>
          </Text>
          <Text>
            {'  '}WebSocket: <Text color="cyan">{url.replace('http', 'ws')}/trpc</Text>
          </Text>
          <Box marginTop={1}>
            <Text dimColor>Press q to stop.</Text>
          </Box>
        </Box>
      ) : (
        <Text>
          <Spinner /> Starting…
        </Text>
      )}
    </Box>
  );
}
