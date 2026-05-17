import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CircleCheck,
  CircleDot,
  CircleX,
  CircleMinus,
  Clock,
  GitBranch,
  Loader,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type RunStatus = 'running' | 'success' | 'failed' | 'gated' | 'cancelled';

interface Run {
  id: string;
  workflow: string;
  status: RunStatus;
  nodes: { total: number; completed: number };
  duration: string;
  agent: string;
  branch: string;
  startedAt: string;
  mrs: number;
}

const STATUS_CONFIG: Record<RunStatus, { icon: React.ReactNode; label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  running: { icon: <Loader className="h-3 w-3 animate-spin" />, label: 'Running', variant: 'default' },
  success: { icon: <CircleCheck className="h-3 w-3" />, label: 'Success', variant: 'secondary' },
  failed: { icon: <CircleX className="h-3 w-3" />, label: 'Failed', variant: 'destructive' },
  gated: { icon: <CircleDot className="h-3 w-3" />, label: 'Gated', variant: 'outline' },
  cancelled: { icon: <CircleMinus className="h-3 w-3" />, label: 'Cancelled', variant: 'secondary' },
};

const MOCK_RUNS: Run[] = [
  {
    id: 'run_1715961600',
    workflow: 'create-todomvc',
    status: 'running',
    nodes: { total: 10, completed: 6 },
    duration: '2:47',
    agent: 'Smith',
    branch: 'fabster/create-todomvc',
    startedAt: '2 min ago',
    mrs: 4,
  },
  {
    id: 'run_1715958000',
    workflow: 'add-auth-flow',
    status: 'gated',
    nodes: { total: 6, completed: 5 },
    duration: '3:12',
    agent: 'Smith',
    branch: 'fabster/add-auth-flow',
    startedAt: '15 min ago',
    mrs: 5,
  },
  {
    id: 'run_1715954400',
    workflow: 'create-dashboard',
    status: 'success',
    nodes: { total: 8, completed: 8 },
    duration: '4:32',
    agent: 'Smith',
    branch: 'fabster/create-dashboard',
    startedAt: '1 hour ago',
    mrs: 8,
  },
  {
    id: 'run_1715950800',
    workflow: 'add-ci-pipeline',
    status: 'success',
    nodes: { total: 4, completed: 4 },
    duration: '1:03',
    agent: 'Jones',
    branch: 'fabster/add-ci-pipeline',
    startedAt: '2 hours ago',
    mrs: 4,
  },
  {
    id: 'run_1715947200',
    workflow: 'create-api-gateway',
    status: 'failed',
    nodes: { total: 7, completed: 4 },
    duration: '5:21',
    agent: 'Smith',
    branch: 'fabster/create-api-gateway',
    startedAt: '3 hours ago',
    mrs: 3,
  },
  {
    id: 'run_1715943600',
    workflow: 'refactor-auth-module',
    status: 'success',
    nodes: { total: 5, completed: 5 },
    duration: '1:48',
    agent: 'Jones',
    branch: 'fabster/refactor-auth-module',
    startedAt: '5 hours ago',
    mrs: 5,
  },
  {
    id: 'run_1715940000',
    workflow: 'add-monitoring',
    status: 'cancelled',
    nodes: { total: 3, completed: 1 },
    duration: '0:42',
    agent: 'Smith',
    branch: 'fabster/add-monitoring',
    startedAt: '6 hours ago',
    mrs: 1,
  },
  {
    id: 'run_1715936400',
    workflow: 'create-design-system',
    status: 'success',
    nodes: { total: 12, completed: 12 },
    duration: '8:15',
    agent: 'Smith',
    branch: 'fabster/create-design-system',
    startedAt: 'yesterday',
    mrs: 12,
  },
  {
    id: 'run_1715932800',
    workflow: 'add-e2e-tests',
    status: 'success',
    nodes: { total: 5, completed: 5 },
    duration: '2:33',
    agent: 'Jones',
    branch: 'fabster/add-e2e-tests',
    startedAt: 'yesterday',
    mrs: 5,
  },
  {
    id: 'run_1715929200',
    workflow: 'migrate-to-nx',
    status: 'success',
    nodes: { total: 9, completed: 9 },
    duration: '6:02',
    agent: 'Smith',
    branch: 'fabster/migrate-to-nx',
    startedAt: '2 days ago',
    mrs: 9,
  },
];

export function RunsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h2 className="text-lg font-semibold">Runs</h2>
        <p className="text-sm text-muted-foreground">
          Workflow execution history and live runs
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">MRs</TableHead>
              <TableHead className="text-right">Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_RUNS.map((run) => {
              const status = STATUS_CONFIG[run.status];
              return (
                <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{run.workflow}</TableCell>
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
                          className={`h-full rounded-full ${run.status === 'failed' ? 'bg-destructive' : run.status === 'running' ? 'bg-primary' : 'bg-green-500'}`}
                          style={{ width: `${(run.nodes.completed / run.nodes.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {run.nodes.completed}/{run.nodes.total}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px]">
                          {run.agent.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{run.agent}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="tabular-nums">{run.duration}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <GitBranch className="h-3 w-3" />
                      <span className="truncate max-w-[180px]">{run.branch}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{run.mrs}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{run.startedAt}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
