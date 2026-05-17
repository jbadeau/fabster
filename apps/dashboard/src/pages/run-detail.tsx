import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Clock, CircleCheck, CircleX, CircleDot, CircleMinus, Loader, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  startOffset: number;
  duration: number;
  reasoning?: string;
  inputs?: { name: string; value: string }[];
  rules?: string[];
  logs?: string[];
  mr?: { number: number; status: 'open' | 'merged' | 'closed'; branch: string };
  dependsOn?: string[];
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
      { id: 'init-workspace', name: 'Init Workspace', definition: 'nx:init-workspace', type: 'command', status: 'complete', startOffset: 0, duration: 12, inputs: [{ name: 'name', value: 'todomvc' }], logs: ['> npx create-nx-workspace todomvc --preset=apps', '[complete] Workspace created'], mr: { number: 140, status: 'merged', branch: 'fabster/create-todomvc/init-workspace' } },
      { id: 'add-react', name: 'Add React Plugin', definition: 'nx:add-plugin', type: 'command', status: 'complete', startOffset: 12, duration: 8, dependsOn: ['init-workspace'], inputs: [{ name: 'plugin', value: '@nx/react' }], logs: ['> npx nx add @nx/react', '[complete] Plugin added'], mr: { number: 141, status: 'merged', branch: 'fabster/create-todomvc/add-react' } },
      { id: 'add-node', name: 'Add Node Plugin', definition: 'nx:add-plugin', type: 'command', status: 'complete', startOffset: 12, duration: 6, dependsOn: ['init-workspace'], inputs: [{ name: 'plugin', value: '@nx/node' }], logs: ['> npx nx add @nx/node', '[complete] Plugin added'], mr: { number: 142, status: 'merged', branch: 'fabster/create-todomvc/add-node' } },
      { id: 'generate-frontend', name: 'Generate Frontend', definition: 'nx:generate-app', type: 'command', status: 'complete', startOffset: 20, duration: 10, dependsOn: ['add-react'], inputs: [{ name: 'generator', value: '@nx/react:app' }, { name: 'name', value: 'web' }], logs: ['> npx nx g @nx/react:app web --directory=apps/web', '[complete] App generated'], mr: { number: 143, status: 'merged', branch: 'fabster/create-todomvc/generate-frontend' } },
      { id: 'write-openapi-spec', name: 'Write API Spec', definition: 'openapi:generate-spec', type: 'task', status: 'complete', agent: 'Smith', reasoning: 'medium', startOffset: 18, duration: 83, dependsOn: ['add-node'], inputs: [{ name: 'project', value: 'api-spec' }, { name: 'specPath', value: 'packages/api-spec/todo.openapi.yaml' }], rules: ['linted', 'conformant'], logs: ['[tool] writeFile /repo/packages/api-spec/project.json', '[tool] writeFile /repo/packages/api-spec/todo.openapi.yaml', '[text] Creating Todo schema with id, title, completed, createdAt...', '[text] Defining REST endpoints: GET /todos, POST /todos, PUT /todos/{id}, DELETE /todos/{id}', '[tool] readFile /repo/packages/api-spec/todo.openapi.yaml', '[done] Agent finished'], mr: { number: 144, status: 'merged', branch: 'fabster/create-todomvc/write-openapi-spec' } },
      { id: 'generate-backend', name: 'Generate Backend', definition: 'nx:generate-app', type: 'command', status: 'complete', startOffset: 18, duration: 9, dependsOn: ['add-node'], inputs: [{ name: 'generator', value: '@nx/node:app' }, { name: 'name', value: 'api' }], logs: ['> npx nx g @nx/node:app api --directory=apps/api', '[complete] App generated'], mr: { number: 145, status: 'merged', branch: 'fabster/create-todomvc/generate-backend' } },
      { id: 'generate-client-lib', name: 'Gen Client Lib', definition: 'nx:generate-library', type: 'command', status: 'running', startOffset: 101, duration: 7, dependsOn: ['write-openapi-spec'], inputs: [{ name: 'generator', value: '@nx/js:library' }, { name: 'name', value: 'api-client' }], logs: ['> npx nx g @nx/js:library api-client --directory=packages/api-client'], mr: { number: 146, status: 'open', branch: 'fabster/create-todomvc/generate-client-lib' } },
      { id: 'generate-api-client', name: 'Gen API Client', definition: 'openapi:generate-client', type: 'command', status: 'pending', startOffset: 0, duration: 0, dependsOn: ['generate-client-lib'], inputs: [{ name: 'specPath', value: 'packages/api-spec/todo.openapi.yaml' }] },
      { id: 'implement-backend', name: 'Implement Backend', definition: 'code:implement-backend', type: 'task', status: 'pending', agent: 'Smith', reasoning: 'high', startOffset: 0, duration: 0, dependsOn: ['generate-backend', 'write-openapi-spec'], inputs: [{ name: 'project', value: 'api' }, { name: 'specProject', value: 'api-spec' }], rules: ['successfulBuild', 'linted'] },
      { id: 'implement-frontend', name: 'Implement Frontend', definition: 'code:implement-frontend', type: 'task', status: 'pending', agent: 'Smith', reasoning: 'high', startOffset: 0, duration: 0, dependsOn: ['generate-frontend', 'generate-api-client'], inputs: [{ name: 'project', value: 'web' }, { name: 'clientProject', value: 'api-client' }], rules: ['successfulBuild', 'linted', 'humanApproved'] },
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = selectedNodeId ? run.nodes.find((n) => n.id === selectedNodeId) : null;


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
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 lg:px-6 py-4">
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

      {/* Main content: Gantt + optional detail panel */}
      <div className="flex flex-1 overflow-hidden px-4 lg:px-6 pb-4 lg:pb-6 gap-4 lg:gap-6">
      {/* Gantt chart */}
      <div className="flex-1 rounded-lg border overflow-auto">
        {/* Time axis */}
        <div className="flex border-b bg-muted/30">
          <div className="w-44 shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground">
            Node
          </div>
          <div className="w-24 shrink-0 px-2 py-2 text-xs font-medium text-muted-foreground">
            Status
          </div>
          <div className="w-14 shrink-0 px-2 py-2 text-xs font-medium text-muted-foreground text-right">
            Time
          </div>
          <div className="flex-1 flex relative px-2 py-2 min-w-0">
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
          <div className="w-14 shrink-0 px-2 py-2 text-xs font-medium text-muted-foreground text-right">
            MR
          </div>
        </div>

        {/* Rows with dependency arrows */}
        {run.nodes.map((node) => {
          const leftPct = maxTime > 0 ? (node.startOffset / maxTime) * 100 : 0;
          const widthPct = maxTime > 0 ? Math.max((node.duration / maxTime) * 100, 0.5) : 0;
          const isPending = node.status === 'pending';

          return (
            <div key={node.id} className={`flex items-center border-b last:border-b-0 hover:bg-muted/30 cursor-pointer ${selectedNodeId === node.id ? 'bg-muted/50' : ''}`} onClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}>
              {/* Node name */}
              <div className="w-44 shrink-0 px-3 py-2.5 flex items-center gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{node.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{node.definition}</span>
                </div>
              </div>

              {/* Status */}
              <div className="w-24 shrink-0 px-2 py-2.5 flex items-center gap-1.5">
                {STATUS_ICON[node.status]}
                <span className="text-xs text-muted-foreground">{node.status}</span>
              </div>

              {/* Time */}
              <div className="w-14 shrink-0 px-2 py-2.5 text-right text-xs text-muted-foreground tabular-nums">
                {isPending ? '-' : formatSeconds(node.duration)}
              </div>

              {/* Bar */}
              <div data-timeline className="flex-1 px-2 py-2.5 relative h-10">
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

              {/* MR */}
              <div className="w-14 shrink-0 px-2 py-2.5 text-right text-xs tabular-nums">
                {node.mr ? (
                  <span className={node.mr.status === 'merged' ? 'text-green-600' : 'text-blue-500'}>
                    #{node.mr.number}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Properties panel (right) */}
      {selectedNode && (
        <div className="w-72 shrink-0 rounded-lg border bg-card overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2 min-w-0">
              {STATUS_ICON[selectedNode.status]}
              <span className="font-medium text-sm truncate">{selectedNode.name}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setSelectedNodeId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-3 flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Definition</span>
              <span className="text-sm">{selectedNode.definition}</span>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">{selectedNode.type}</Badge>
              {selectedNode.reasoning && <Badge variant="outline">{selectedNode.reasoning}</Badge>}
            </div>
            {selectedNode.agent && (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[9px]">{selectedNode.agent.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{selectedNode.agent}</span>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Timing</span>
              <span className="text-sm">
                {selectedNode.status === 'pending' ? 'Waiting' : `${formatSeconds(selectedNode.duration)} (started at ${formatSeconds(selectedNode.startOffset)})`}
              </span>
            </div>
            <Separator />
            {selectedNode.inputs && selectedNode.inputs.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Inputs</span>
                {selectedNode.inputs.map((input) => (
                  <div key={input.name} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{input.name}</span>
                    <span className="font-mono truncate ml-2">{input.value}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedNode.rules && selectedNode.rules.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Rules</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.rules.map((rule) => (
                      <Badge key={rule} variant="outline" className="text-xs">
                        {selectedNode.status === 'complete' ? '✓' : '○'} {rule}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
            {selectedNode.mr && (
              <>
                <Separator />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Merge Request</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${selectedNode.mr.status === 'merged' ? 'text-green-600' : 'text-blue-500'}`}>
                      #{selectedNode.mr.number}
                    </span>
                    <Badge variant="outline" className="text-xs">{selectedNode.mr.status}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono truncate">{selectedNode.mr.branch}</span>
                </div>
              </>
            )}
            <Separator />
            {/* Logs */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Logs</span>
              {selectedNode.logs && selectedNode.logs.length > 0 ? (
                <div className="flex flex-col gap-0.5 font-mono text-xs">
                  {selectedNode.logs.map((line, i) => (
                    <span key={i} className={logColor(line)}>{line}</span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">No logs yet</span>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function logColor(line: string): string {
  if (line.startsWith('[tool]')) return 'text-purple-500';
  if (line.startsWith('[text]')) return 'text-foreground';
  if (line.startsWith('[done]') || line.startsWith('[complete]')) return 'text-green-500';
  if (line.startsWith('ERROR') || line.startsWith('[failed]')) return 'text-destructive';
  if (line.startsWith('>')) return 'text-cyan-500';
  return 'text-muted-foreground';
}
