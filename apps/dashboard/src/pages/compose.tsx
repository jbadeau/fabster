import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
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
    <div className="rounded-lg border bg-card p-3 shadow-sm min-w-[180px] relative">
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
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
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = {
  taskNode: TaskNode,
};

// TodoMVC workflow from examples/todomvc/workflow.ts
const initialNodes: Node[] = [
  {
    id: 'init-workspace',
    type: 'taskNode',
    position: { x: 300, y: 0 },
    data: { label: 'Init Workspace', type: 'command' },
  },
  {
    id: 'add-react',
    type: 'taskNode',
    position: { x: 300, y: 100 },
    data: { label: 'Add React Plugin', type: 'command' },
  },
  {
    id: 'add-node',
    type: 'taskNode',
    position: { x: 300, y: 200 },
    data: { label: 'Add Node Plugin', type: 'command' },
  },
  {
    id: 'write-openapi-spec',
    type: 'taskNode',
    position: { x: 300, y: 300 },
    data: { label: 'Write OpenAPI Spec', type: 'task', reasoning: 'medium' },
  },
  {
    id: 'generate-client-lib',
    type: 'taskNode',
    position: { x: 300, y: 400 },
    data: { label: 'Generate Client Lib', type: 'command' },
  },
  {
    id: 'generate-api-client',
    type: 'taskNode',
    position: { x: 300, y: 500 },
    data: { label: 'Generate API Client', type: 'command' },
  },
  {
    id: 'generate-backend',
    type: 'taskNode',
    position: { x: 300, y: 600 },
    data: { label: 'Generate Backend App', type: 'command' },
  },
  {
    id: 'implement-backend',
    type: 'taskNode',
    position: { x: 300, y: 700 },
    data: { label: 'Implement Backend', type: 'task', reasoning: 'high' },
  },
  {
    id: 'generate-frontend',
    type: 'taskNode',
    position: { x: 300, y: 800 },
    data: { label: 'Generate Frontend App', type: 'command' },
  },
  {
    id: 'implement-frontend',
    type: 'taskNode',
    position: { x: 300, y: 900 },
    data: { label: 'Implement Frontend', type: 'task', reasoning: 'high' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e-init-react', source: 'init-workspace', target: 'add-react' },
  { id: 'e-react-node', source: 'add-react', target: 'add-node' },
  { id: 'e-node-spec', source: 'add-node', target: 'write-openapi-spec' },
  { id: 'e-spec-clientlib', source: 'write-openapi-spec', target: 'generate-client-lib' },
  { id: 'e-clientlib-client', source: 'generate-client-lib', target: 'generate-api-client' },
  { id: 'e-client-backend', source: 'generate-api-client', target: 'generate-backend' },
  { id: 'e-backend-impl', source: 'generate-backend', target: 'implement-backend' },
  { id: 'e-impl-frontend', source: 'implement-backend', target: 'generate-frontend' },
  { id: 'e-frontend-impl', source: 'generate-frontend', target: 'implement-frontend' },
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
