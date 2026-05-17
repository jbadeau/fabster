import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Clock, CircleCheck, CircleX, CircleDot, CircleMinus, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type NodeStatus = 'complete' | 'running' | 'failed' | 'pending' | 'skipped' | 'gated';

interface RunNode {
  id: string;
  name: string;
  definition: string;
  type: 'task' | 'command';
  status: NodeStatus;
  agent?: string;
  startOffset: number; // seconds from run start
  duration: number;    // seconds
}

interface RunData {
  id: string;
  workflow: string;
  status: 'running' | 'success' | 'failed' | 'gated' | 'cancelled';
  totalDuration: number; // seconds
  startedAt: string;
  nodes: RunNode[];
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  complete: <CircleCheck className="h-3 w-3 text-green-500" />,
  running: <Loader className="h-3 w-3 animate-spin text-primary" />,
  failed: <CircleX className="h-3 w-3 text-destructive" />,
  pending: <Clock className="h-3 w-3 text-muted-foreground" />,
  skipped: <CircleMinus className="h-3 w-3 text-muted-foreground" />,
  gated: <CircleDot className="h-3 w-3 text-yellow-500" />,
};

const BAR_COLORS: Record<string, string> = {
  complete: 'bg-green-500',
  running: 'bg-primary animate-pulse',
  failed: 'bg-destructive',
  pending: 'bg-muted',
  skipped: 'bg-muted',
  gated: 'bg-yellow-500',
};

// Mock data for the create-todomvc run (parallelized)
const MOCK_RUNS: Record<string, RunData> = {
  run_1715961600: {
    id: 'run_1715961600',
    workflow: 'create-todomvc',
    status: 'running',
    totalDuration: 272,
    startedAt: '2 min ago',
    nodes: [
      { id: 'init-workspace', name: 'Init Workspace', definition: 'nx:init-workspace', type: 'command', status: 'complete', startOffset: 0, duration: 12 },
      { id: 'add-react', name: 'Add React Plugin', definition: 'nx:add-plugin', type: 'command', status: 'complete', startOffset: 12, duration: 8 },
      { id: 'add-node', name: 'Add Node Plugin', definition: 'nx:add-plugin', type: 'command', status: 'complete', startOffset: 12, duration: 6 },
      { id: 'generate-frontend', name: 'Generate Frontend', definition: 'nx:generate-app', type: 'command', status: 'complete', startOffset: 20, duration: 10 },
      { id: 'write-openapi-spec', name: 'Write API Spec', definition: 'openapi:generate-spec', type: 'task', status: 'complete', agent: 'Smith', startOffset: 18, duration: 83 },
      { id: 'generate-backend', name: 'Generate Backend', definition: 'nx:generate-app', type: 'command', status: 'complete', startOffset: 18, duration: 9 },
      { id: 'generate-client-lib', name: 'Gen Client Lib', definition: 'nx:generate-library', type: 'command', status: 'running', startOffset: 101, duration: 7 },
      { id: 'generate-api-client', name: 'Gen API Client', definition: 'openapi:generate-client', type: 'command', status: 'pending', startOffset: 0, duration: 0 },
      { id: 'implement-backend', name: 'Implement Backend', definition: 'code:implement-backend', type: 'task', status: 'pending', agent: 'Smith', startOffset: 0, duration: 0 },
      { id: 'implement-frontend', name: 'Implement Frontend', definition: 'code:implement-frontend', type: 'task', status: 'pending', agent: 'Smith', startOffset: 0, duration: 0 },
    ],
  },
  run_1715954400: {
    id: 'run_1715954400',
    workflow: 'create-dashboard',
    status: 'success',
    totalDuration: 272,
    startedAt: '1 hour ago',
    nodes: [
      { id: 'init-workspace', name: 'Init Workspace', definition: 'nx:init-workspace', type: 'command', status: 'complete', startOffset: 0, duration: 12 },
      { id: 'add-react', name: 'Add React Plugin', definition: 'nx:add-plugin', type: 'command', status: 'complete', startOffset: 12, duration: 8 },
      { id: 'add-node', name: 'Add Node Plugin', definition: 'nx:add-plugin', type: 'command', status: 'complete', startOffset: 12, duration: 6 },
      { id: 'generate-frontend', name: 'Generate Frontend', definition: 'nx:generate-app', type: 'command', status: 'complete', startOffset: 20, duration: 10 },
      { id: 'write-openapi-spec', name: 'Write API Spec', definition: 'openapi:generate-spec', type: 'task', status: 'complete', agent: 'Smith', startOffset: 18, duration: 83 },
      { id: 'generate-backend', name: 'Generate Backend', definition: 'nx:generate-app', type: 'command', status: 'complete', startOffset: 18, duration: 9 },
      { id: 'generate-client-lib', name: 'Gen Client Lib', definition: 'nx:generate-library', type: 'command', status: 'complete', startOffset: 101, duration: 7 },
      { id: 'generate-api-client', name: 'Gen API Client', definition: 'openapi:generate-client', type: 'command', status: 'complete', startOffset: 108, duration: 11 },
      { id: 'implement-backend', name: 'Implement Backend', definition: 'code:implement-backend', type: 'task', status: 'complete', agent: 'Smith', startOffset: 101, duration: 48 },
      { id: 'implement-frontend', name: 'Implement Frontend', definition: 'code:implement-frontend', type: 'task', status: 'complete', agent: 'Smith', startOffset: 119, duration: 58 },
    ],
  },
};

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function RunDetailPage() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const run = MOCK_RUNS[runId ?? ''] ?? MOCK_RUNS['run_1715954400'];

  const maxTime = Math.max(
    run.totalDuration,
    ...run.nodes.map((n) => n.startOffset + n.duration),
  );

  // Time markers
  const markerCount = 6;
  const markers = Array.from({ length: markerCount + 1 }, (_, i) =>
    Math.round((maxTime / markerCount) * i),
  );

  const runStatusBadge = {
    running: { icon: <Loader className="h-3 w-3 animate-spin" />, label: 'Running', variant: 'default' as const },
    success: { icon: <CircleCheck className="h-3 w-3" />, label: 'Success', variant: 'secondary' as const },
    failed: { icon: <CircleX className="h-3 w-3" />, label: 'Failed', variant: 'destructive' as const },
    gated: { icon: <CircleDot className="h-3 w-3" />, label: 'Gated', variant: 'outline' as const },
    cancelled: { icon: <CircleMinus className="h-3 w-3" />, label: 'Cancelled', variant: 'secondary' as const },
  }[run.status];

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/runs')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{run.workflow}</h2>
            <Badge variant={runStatusBadge.variant} className="gap-1">
              {runStatusBadge.icon}
              {runStatusBadge.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {run.startedAt} · {formatSeconds(run.totalDuration)} · {run.nodes.length} nodes
          </p>
        </div>
      </div>

      {/* Gantt chart */}
      <div className="rounded-lg border overflow-hidden">
        {/* Time axis */}
        <div className="flex border-b bg-muted/30">
          <div className="w-48 shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground">
            Node
          </div>
          <div className="flex-1 flex relative px-2 py-2">
            {markers.map((t) => (
              <div
                key={t}
                className="absolute text-[10px] text-muted-foreground tabular-nums"
                style={{ left: `${(t / maxTime) * 100}%`, transform: 'translateX(-50%)' }}
              >
                {formatSeconds(t)}
              </div>
            ))}
          </div>
          <div className="w-16 shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground text-right">
            Time
          </div>
        </div>

        {/* Rows */}
        {run.nodes.map((node) => {
          const leftPct = maxTime > 0 ? (node.startOffset / maxTime) * 100 : 0;
          const widthPct = maxTime > 0 ? Math.max((node.duration / maxTime) * 100, 0.5) : 0;
          const isPending = node.status === 'pending';

          return (
            <div key={node.id} className="flex items-center border-b last:border-b-0 hover:bg-muted/30">
              {/* Node name */}
              <div className="w-48 shrink-0 px-3 py-2.5 flex items-center gap-2">
                {STATUS_ICON[node.status]}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{node.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{node.definition}</span>
                </div>
              </div>

              {/* Bar */}
              <div className="flex-1 px-2 py-2.5 relative h-10">
                {/* Grid lines */}
                {markers.map((t) => (
                  <div
                    key={t}
                    className="absolute top-0 bottom-0 border-l border-dashed border-muted"
                    style={{ left: `${(t / maxTime) * 100}%` }}
                  />
                ))}

                {!isPending && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-sm ${BAR_COLORS[node.status]}`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          minWidth: '4px',
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <div className="font-medium">{node.name}</div>
                        <div>{node.definition}</div>
                        <div>Start: {formatSeconds(node.startOffset)} · Duration: {formatSeconds(node.duration)}</div>
                        {node.agent && <div>Agent: {node.agent}</div>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Duration */}
              <div className="w-16 shrink-0 px-3 py-2.5 text-right text-xs text-muted-foreground tabular-nums">
                {isPending ? '-' : formatSeconds(node.duration)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
