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

type RunStatus = 'draft' | 'running' | 'success' | 'failed' | 'gated' | 'cancelled';

interface Workflow {
  id: string;
  name: string;
  status: RunStatus;
  nodes: { total: number; completed: number };
  duration: string;
  startedAt: string;
  mrs: number;
}

const STATUS_CONFIG: Record<RunStatus, { icon: React.ReactNode; label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { icon: <PenLine className="h-3 w-3" />, label: 'Draft', variant: 'outline' },
  running: { icon: <Loader className="h-3 w-3 animate-spin" />, label: 'Running', variant: 'default' },
  success: { icon: <CircleCheck className="h-3 w-3" />, label: 'Success', variant: 'secondary' },
  failed: { icon: <CircleX className="h-3 w-3" />, label: 'Failed', variant: 'destructive' },
  gated: { icon: <CircleDot className="h-3 w-3" />, label: 'Gated', variant: 'outline' },
  cancelled: { icon: <CircleMinus className="h-3 w-3" />, label: 'Cancelled', variant: 'secondary' },
};

const MOCK_WORKFLOWS: Workflow[] = [
  { id: 'draft_1', name: 'create-todomvc', status: 'draft', nodes: { total: 10, completed: 0 }, duration: '-', startedAt: 'just now', mrs: 0 },
  { id: 'run_1715961600', name: 'create-todomvc', status: 'running', nodes: { total: 10, completed: 3 }, duration: '1:47', startedAt: '2 min ago', mrs: 3 },
  { id: 'run_1715954400', name: 'create-todomvc', status: 'success', nodes: { total: 10, completed: 10 }, duration: '4:32', startedAt: '1 hour ago', mrs: 10 },
  { id: 'run_1715947200', name: 'create-todomvc', status: 'failed', nodes: { total: 10, completed: 6 }, duration: '3:21', startedAt: '3 hours ago', mrs: 6 },
];

export function WorkflowsPage() {
  const navigate = useNavigate();

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
            {MOCK_WORKFLOWS.map((wf) => {
              const status = STATUS_CONFIG[wf.status];
              return (
                <TableRow key={wf.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/workflow/${wf.id}`)}>
                  <TableCell className="font-medium">{wf.name}</TableCell>
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
                          className={`h-full rounded-full ${wf.status === 'failed' ? 'bg-destructive' : wf.status === 'running' ? 'bg-primary' : 'bg-green-500'}`}
                          style={{ width: `${(wf.nodes.completed / wf.nodes.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {wf.nodes.completed}/{wf.nodes.total}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="tabular-nums">{wf.duration}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{wf.mrs}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{wf.startedAt}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
