import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { conformant } from '@fabster/core';
import { runGates } from '../gates/gate-checker.js';

/**
 * A tiny real HTTP server standing in for a generated backend — CRUD over
 * an in-memory array, deliberately given the exact bug found by hand
 * earlier in this project's history: PUT requires `title` on every
 * request, rejecting a partial update (e.g. a "toggle complete" request
 * with only `{ completed: true }`). One version has the bug, one doesn't,
 * so the gate's real job — catching it — is verified both ways.
 */
function serverScript(port: number, requireTitleOnPut: boolean): string {
  return `
const http = require('node:http');
let todos = [];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const data = body ? JSON.parse(body) : {};
    const url = new URL(req.url, 'http://localhost');
    const id = url.pathname.split('/')[2];
    if (req.method === 'GET' && url.pathname === '/todos') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(todos));
    } else if (req.method === 'POST' && url.pathname === '/todos') {
      const todo = { id: String(todos.length + 1), title: data.title, completed: false };
      todos.push(todo);
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify(todo));
    } else if (req.method === 'PUT' && id) {
      ${requireTitleOnPut ? `
      if (typeof data.title !== 'string') {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ message: 'title is required and must be a string' }));
        return;
      }
      ` : ''}
      const todo = todos.find((t) => t.id === id);
      Object.assign(todo, data);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(todo));
    } else if (req.method === 'DELETE' && id) {
      todos = todos.filter((t) => t.id !== id);
      res.writeHead(204);
      res.end();
    } else {
      res.writeHead(404);
      res.end();
    }
  });
});
server.listen(${port});
`;
}

const CONFORMANCE_REQUESTS = [
  { method: 'POST' as const, path: '/todos', body: { title: 'buy milk' }, expectStatus: 201, capture: 'created' },
  // The exact request a "toggle complete" UI sends — only the changed field.
  { method: 'PUT' as const, path: '/todos/{created.id}', body: { completed: true }, expectStatus: 200 },
  { method: 'DELETE' as const, path: '/todos/{created.id}', expectStatus: 204 },
];

describe('conformant gate', () => {
  it('passes against a backend that correctly supports partial updates', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-conformant-'));
    const port = 3801;
    try {
      await writeFile(join(cwd, 'server.js'), serverScript(port, false));

      const gates = [conformant({
        start: 'node server.js',
        baseUrl: `http://localhost:${port}`,
        readyPath: '/todos',
        requests: CONFORMANCE_REQUESTS,
      })];

      const [result] = await runGates(gates, cwd);

      expect(result.passed).toBe(true);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }, 15000);

  it('fails and names the request when the backend rejects a partial update', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-conformant-bug-'));
    const port = 3802;
    try {
      await writeFile(join(cwd, 'server.js'), serverScript(port, true));

      const gates = [conformant({
        start: 'node server.js',
        baseUrl: `http://localhost:${port}`,
        readyPath: '/todos',
        requests: CONFORMANCE_REQUESTS,
      })];

      const [result] = await runGates(gates, cwd);

      expect(result.passed).toBe(false);
      expect(result.detail).toContain('PUT /todos/{created.id}');
      expect(result.detail).toContain('expected status 200, got 400');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }, 15000);

  it('fails cleanly when the service never becomes reachable', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'fabster-conformant-noserver-'));
    try {
      const gates = [conformant({
        start: 'true', // exits immediately, never binds a port
        baseUrl: 'http://localhost:3899',
        timeoutMs: 500,
        requests: [],
      })];

      const [result] = await runGates(gates, cwd);

      expect(result.passed).toBe(false);
      expect(result.detail).toMatch(/never became reachable/);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }, 10000);
});
