import { useNavigate } from 'react-router';
import { Plus, Clock, CircleCheck, CircleX, CircleDot, CircleMinus, Loader, PenLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc';

type RunStatus = 'draft' | 'running' | 'success' | 'failed' | 'gated' | 'cancelled';

const STATUS_CONFIG: Record<RunStatus, { icon: React.ReactNode; label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { icon: <PenLine className="h-3 w-3" />, label: 'Draft', variant: 'outline' },
  running: { icon: <Loader className="h-3 w-3 animate-spin" />, label: 'Running', variant: 'default' },
  success: { icon: <CircleCheck className="h-3 w-3" />, label: 'Success', variant: 'secondary' },
  failed: { icon: <CircleX className="h-3 w-3" />, label: 'Failed', variant: 'outline' },
  gated: { icon: <CircleDot className="h-3 w-3" />, label: 'Gated', variant: 'outline' },
  cancelled: { icon: <CircleMinus className="h-3 w-3" />, label: 'Cancelled', variant: 'secondary' },
};

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatDuration(startedAt: number, status: string): string {
  const end = status === 'running' ? Date.now() : Date.now(); // TODO: track endedAt on server
  const seconds = Math.floor((end - startedAt) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function WorkflowsPage() {
  const navigate = useNavigate();
  const { data } = trpc.listRuns.useQuery(undefined, { refetchInterval: 3000 });

  const runs = data?.runs ?? [];

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Workflows</h2>
          <p className="text-sm text-muted-foreground">
            Current and past workflow executions
          </p>
        </div>
        <Button onClick={() => navigate('/workflow')}>
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">MRs</TableHead>
              <TableHead className="text-right">Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => {
              const status = STATUS_CONFIG[run.status as RunStatus] ?? STATUS_CONFIG.running;
              const total = run.nodes.length;
              const completed = run.nodes.filter((n) => n.state === 'complete').length;
              const duration = formatDuration(run.startedAt, run.status);
              const startedAt = formatRelativeTime(run.startedAt);
              const mrs = completed;

              return (
                <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/workflow/${run.id}`)}>
                  <TableCell className="font-medium">{run.workflowName}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className="gap-1">
                      {status.icon}
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-foreground"
                          style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {completed}/{total}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="tabular-nums">{duration}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{mrs}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{startedAt}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
