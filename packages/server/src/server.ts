import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appRouter } from './router.js';

export interface ServerOptions {
  port?: number;
  host?: string;
  open?: boolean;
  dashboardDir?: string;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function findDashboardDir(): string | undefined {
  // Look for the built dashboard relative to the server package
  const serverDir = fileURLToPath(new URL('.', import.meta.url));
  const candidates = [
    join(serverDir, '../../..', 'apps/dashboard/dist'),
    join(serverDir, '../../../..', 'apps/dashboard/dist'),
  ];
  return candidates.find(() => true); // Will be validated at serve time
}

export function startServer(options: ServerOptions = {}) {
  const port = options.port ?? 3456;
  const host = options.host ?? '0.0.0.0';
  const dashboardDir = options.dashboardDir ?? findDashboardDir();

  // Create a raw HTTP server that handles both tRPC and static files
  const trpcHandler = createHTTPHandler({ router: appRouter });

  const trpcPrefix = '/trpc';
  const server = createServer(async (req, res) => {
    const url = req.url ?? '/';

    // tRPC API routes
    if (url.startsWith(trpcPrefix)) {
      // Strip /trpc prefix — tRPC expects just the procedure name
      req.url = url.slice(trpcPrefix.length) || '/';
      trpcHandler(req, res);
      return;
    }

    // Serve dashboard static files
    if (dashboardDir) {
      try {
        let filePath = join(dashboardDir, url === '/' ? 'index.html' : url);
        let content: Buffer;

        try {
          content = await readFile(filePath);
        } catch {
          // SPA fallback — serve index.html for all non-file routes
          filePath = join(dashboardDir, 'index.html');
          content = await readFile(filePath);
        }

        const ext = extname(filePath);
        const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(content);
        return;
      } catch {
        // Fall through to 404
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(port, host);

  // WebSocket server for subscriptions. Mounted on the /trpc path so the
  // dashboard dev server's proxy (which only forwards /trpc) can reach it.
  const wss = new WebSocketServer({ server, path: '/trpc' });
  const wssHandler = applyWSSHandler({
    wss,
    router: appRouter,
  });

  const url = `http://localhost:${port}`;
  console.log(`\n  fabster daemon running\n`);
  console.log(`  Dashboard:  ${url}`);
  console.log(`  API:        ${url}/trpc`);
  console.log(`  WebSocket:  ws://localhost:${port}\n`);

  // Open browser if requested
  if (options.open) {
    openBrowser(url);
  }

  return {
    server,
    wss,
    url,
    close: () => {
      wssHandler.broadcastReconnectNotification();
      wss.close();
      server.close();
    },
  };
}

async function openBrowser(url: string): Promise<void> {
  const { exec } = await import('node:child_process');
  const platform = process.platform;
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';

  exec(`${cmd} ${url}`, (err) => {
    if (err) {
      // Silently fail — user can open the URL manually (e.g., Coder workspace)
    }
  });
}
