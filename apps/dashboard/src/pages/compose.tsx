import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  Panel,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Play, Save, ClipboardList, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Custom node component for tasks
function TaskNode({ data }: { data: { label: string; type: 'task' | 'command'; reasoning?: string } }) {
  const isTask = data.type === 'task';
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm min-w-[180px]">
      <div className="flex items-center gap-2">
        {isTask ? (
          <ClipboardList className="h-4 w-4 text-blue-500" />
        ) : (
          <Terminal className="h-4 w-4 text-green-500" />
        )}
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <div className="mt-2 flex gap-1.5">
        <Badge variant="secondary" className="text-xs">
          {data.type}
        </Badge>
        {data.reasoning && (
          <Badge variant="outline" className="text-xs">
            {data.reasoning}
          </Badge>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  taskNode: TaskNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'taskNode',
    position: { x: 250, y: 50 },
    data: { label: 'Init Workspace', type: 'command' },
  },
  {
    id: '2',
    type: 'taskNode',
    position: { x: 100, y: 200 },
    data: { label: 'Generate API Spec', type: 'task', reasoning: 'medium' },
  },
  {
    id: '3',
    type: 'taskNode',
    position: { x: 400, y: 200 },
    data: { label: 'Generate Client', type: 'command' },
  },
  {
    id: '4',
    type: 'taskNode',
    position: { x: 250, y: 350 },
    data: { label: 'Implement Backend', type: 'task', reasoning: 'high' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-4', source: '3', target: '4' },
];

export function ComposePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges],
  );

  const addNode = (name: string, type: 'task' | 'command', reasoning?: string, dependsOn?: string[]) => {
    const id = String(Date.now());
    const newNode: Node = {
      id,
      type: 'taskNode',
      position: { x: 250, y: (nodes.length + 1) * 150 },
      data: { label: name, type, reasoning: type === 'task' ? reasoning : undefined },
    };
    setNodes((nds) => [...nds, newNode]);

    // Create edges from dependsOn
    if (dependsOn && dependsOn.length > 0) {
      const newEdges: Edge[] = dependsOn.map((sourceId) => ({
        id: `e${sourceId}-${id}`,
        source: sourceId,
        target: id,
      }));
      setEdges((eds) => [...eds, ...newEdges]);
    }

    setIsAddOpen(false);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          className="!bg-card !border-border"
          nodeColor="#6366f1"
        />
        <Panel position="top-right" className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Node
          </Button>
          <Button size="sm" variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button size="sm">
            <Play className="mr-2 h-4 w-4" />
            Run
          </Button>
        </Panel>
      </ReactFlow>

      <AddNodeDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAdd={addNode}
        existingNodes={nodes}
      />
    </div>
  );
}

function AddNodeDialog({
  open,
  onOpenChange,
  onAdd,
  existingNodes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, type: 'task' | 'command', reasoning?: string, dependsOn?: string[]) => void;
  existingNodes: Node[];
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'task' | 'command'>('task');
  const [reasoning, setReasoning] = useState('medium');
  const [dependsOn, setDependsOn] = useState<string[]>([]);

  const toggleDep = (id: string) => {
    setDependsOn((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), type, type === 'task' ? reasoning : undefined, dependsOn.length > 0 ? dependsOn : undefined);
    setName('');
    setDependsOn([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Node</DialogTitle>
            <DialogDescription>
              Add a task or command node to the workflow
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="node-name">Name</Label>
              <Input
                id="node-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Implement Frontend"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="node-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'task' | 'command')}>
                <SelectTrigger id="node-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task (agentic)</SelectItem>
                  <SelectItem value="command">Command (deterministic)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === 'task' && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="node-reasoning">Reasoning Level</Label>
                <Select value={reasoning} onValueChange={setReasoning}>
                  <SelectTrigger id="node-reasoning">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {existingNodes.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Depends On</Label>
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto rounded-md border p-2">
                {existingNodes.map((node) => (
                  <label key={node.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={dependsOn.includes(node.id)}
                      onCheckedChange={() => toggleDep(node.id)}
                    />
                    {node.data.label as string}
                  </label>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
