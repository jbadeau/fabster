import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpLink, splitLink, wsLink, createWSClient } from '@trpc/client';
import { trpc } from './trpc';

// Derive daemon URLs from current page origin (works with port forwarding)
function getDaemonUrl(): string {
  return `${window.location.origin}/trpc`;
}

function getDaemonWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/trpc`;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [wsClient] = useState(() => createWSClient({ url: getDaemonWsUrl() }));
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        splitLink({
          condition: (op) => op.type === 'subscription',
          true: wsLink({ client: wsClient }),
          false: httpLink({ url: getDaemonUrl() }),
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
