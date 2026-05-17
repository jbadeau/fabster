import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { appRouter } from './router.js';

export interface ServerOptions {
  port?: number;
  host?: string;
}

export function startServer(options: ServerOptions = {}) {
  const port = options.port ?? 3456;
  const host = options.host ?? 'localhost';

  // HTTP server for queries and mutations
  const httpServer = createHTTPServer({
    router: appRouter,
  });

  const server = httpServer.listen(port, host);

  // WebSocket server for subscriptions
  const wss = new WebSocketServer({ server });
  const wssHandler = applyWSSHandler({
    wss,
    router: appRouter,
  });

  console.log(`fabster daemon listening on http://${host}:${port}`);
  console.log(`WebSocket subscriptions on ws://${host}:${port}`);

  return {
    server,
    wss,
    close: () => {
      wssHandler.broadcastReconnectNotification();
      wss.close();
      server.close();
    },
  };
}
