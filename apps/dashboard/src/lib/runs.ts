import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@fabster/server';

type RouterOutput = inferRouterOutputs<AppRouter>;

/** A single run as returned by the `listRuns` procedure. */
export type RunSummary = RouterOutput['listRuns']['runs'][number];

/** Row shape consumed by the dashboard runs table. */
export interface RunTableRow {
  id: number;
  workflow: string;
  status: string;
  nodes: number;
  duration: string;
  agent: string;
  date: string;
}

/** Format elapsed time as m:ss, or an em dash when the run never finished. */
export function formatDuration(startedAt: number, finishedAt?: number): string {
  if (!finishedAt) return '—';
  const secs = Math.max(0, Math.round((finishedAt - startedAt) / 1000));
  const mins = Math.floor(secs / 60);
  return `${mins}:${(secs % 60).toString().padStart(2, '0')}`;
}

/** Distinct agents that executed at least one node in the run. */
export function runAgents(run: RunSummary): string[] {
  return [
    ...new Set(
      run.nodes
        .map((n) => n.agent)
        .filter((a): a is string => Boolean(a)),
    ),
  ];
}

/** Derive a stable numeric row id from the `run_<timestamp>` id. */
function runRowId(run: RunSummary): number {
  const n = Number(run.id.replace(/\D/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function toTableRow(run: RunSummary): RunTableRow {
  const agents = runAgents(run);
  return {
    id: runRowId(run),
    workflow: run.workflowName,
    status: run.status,
    nodes: run.nodes.length,
    duration: formatDuration(run.startedAt, run.finishedAt ?? undefined),
    agent: agents.length > 0 ? agents.join(', ') : '—',
    date: new Date(run.startedAt).toISOString().slice(0, 10),
  };
}

export interface RunMetrics {
  total: number;
  byStatus: Record<string, number>;
  /** success / terminal runs, or null when there are no terminal runs. */
  passRate: number | null;
  /** Nodes that reached the `complete` state across all runs. */
  nodesExecuted: number;
  agents: string[];
  /** Mean duration over finished runs, or null when none have finished. */
  avgDuration: string | null;
}

export function computeMetrics(runs: RunSummary[]): RunMetrics {
  const byStatus: Record<string, number> = {};
  let nodesExecuted = 0;
  const agents = new Set<string>();
  const durations: number[] = [];

  for (const run of runs) {
    byStatus[run.status] = (byStatus[run.status] ?? 0) + 1;
    nodesExecuted += run.nodes.filter((n) => n.state === 'complete').length;
    for (const a of runAgents(run)) agents.add(a);
    if (run.finishedAt) durations.push(run.finishedAt - run.startedAt);
  }

  const terminal = runs.filter((r) => r.status !== 'running').length;
  const succeeded = byStatus['success'] ?? 0;

  let avgDuration: string | null = null;
  if (durations.length > 0) {
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    avgDuration = formatDuration(0, mean);
  }

  return {
    total: runs.length,
    byStatus,
    passRate: terminal > 0 ? succeeded / terminal : null,
    nodesExecuted,
    agents: [...agents],
    avgDuration,
  };
}

/** Succeeded vs. failed run counts grouped by calendar day, sorted ascending. */
export function runsByDay(
  runs: RunSummary[],
): { date: string; succeeded: number; failed: number }[] {
  const byDay = new Map<string, { succeeded: number; failed: number }>();
  for (const run of runs) {
    const day = new Date(run.startedAt).toISOString().slice(0, 10);
    const entry = byDay.get(day) ?? { succeeded: 0, failed: 0 };
    if (run.status === 'success') entry.succeeded += 1;
    else if (run.status !== 'running') entry.failed += 1;
    byDay.set(day, entry);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }));
}
