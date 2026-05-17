import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useReactFlow,
  ReactFlowProvider,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type DefaultEdgeOptions,
  type NodeMouseHandler,
  MarkerType,
  Panel,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Play, Save, ClipboardList, Terminal, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Schema field types
interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  value?: string | number | boolean;
}

// Node data shape
interface NodeData {
  label: string;
  definition: string;
  type: 'task' | 'command';
  reasoning?: string;
  agent?: string;
  purpose?: string;
  run?: string;
  inputs?: SchemaField[];
  outputs?: SchemaField[];
  requirements?: string[];
  rules?: string[];
  permissions?: { tools?: string[] };
  [key: string]: unknown;
}

function resolveTemplate(template: string, inputs?: SchemaField[]): string {
  if (!inputs) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const field = inputs.find((f) => f.name === key);
    return field?.value != null ? String(field.value) : match;
  });
}

// Custom node component
function TaskNode({ data, selected }: { data: NodeData; selected?: boolean }) {
  const isTask = data.type === 'task';
  return (
    <div className={`rounded-lg border bg-card p-3 shadow-sm w-[240px] relative ${selected ? 'ring-2 ring-primary' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <div className="flex items-center gap-2">
        {isTask ? (
          <ClipboardList className="h-4 w-4 text-blue-500 shrink-0" />
        ) : (
          <Terminal className="h-4 w-4 text-green-500 shrink-0" />
        )}
        <span className="text-sm font-medium">{data.definition}</span>
      </div>
      {data.inputs && data.inputs.length > 0 && (
        <div className="mt-1.5 ml-6 flex flex-col gap-0.5">
          {data.inputs.map((input) => (
            <span key={input.name} className="text-xs text-muted-foreground truncate">
              {input.name}: <span className="text-foreground">{String(input.value ?? '')}</span>
            </span>
          ))}
        </div>
      )}
      {isTask && (
        <div className="mt-1.5 ml-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Avatar className="h-4 w-4">
            <AvatarFallback className="text-[8px]">
              {(data.agent ?? '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-foreground">{data.agent ?? 'unassigned'}</span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = {
  taskNode: TaskNode,
};

// TodoMVC workflow — parallelized DAG with full data
const initialNodes: Node[] = [
  {
    id: 'init-workspace',
    type: 'taskNode',
    position: { x: 350, y: 0 },
    data: { label: 'Init Workspace', definition: 'init-workspace', type: 'command', run: 'npx create-nx-workspace {name} --preset=apps --ci=skip --nx-cloud=skip', inputs: [{ name: 'name', type: 'string', description: 'Workspace name', value: 'todomvc' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'add-react',
    type: 'taskNode',
    position: { x: 100, y: 120 },
    data: { label: 'Add React Plugin', definition: 'add-nx-plugin', type: 'command', run: 'npx nx add {plugin}', inputs: [{ name: 'plugin', type: 'string', description: 'Nx plugin package', value: '@nx/react' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'add-node',
    type: 'taskNode',
    position: { x: 600, y: 120 },
    data: { label: 'Add Node Plugin', definition: 'add-nx-plugin', type: 'command', run: 'npx nx add {plugin}', inputs: [{ name: 'plugin', type: 'string', description: 'Nx plugin package', value: '@nx/node' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'generate-frontend',
    type: 'taskNode',
    position: { x: 100, y: 240 },
    data: { label: 'Generate Frontend App', definition: 'generate-app', type: 'command', run: 'npx nx g {generator} {name} --directory={directory}', inputs: [{ name: 'generator', type: 'string', description: 'Nx generator', value: '@nx/react:app' }, { name: 'name', type: 'string', description: 'App name', value: 'web' }, { name: 'directory', type: 'string', description: 'Output directory', value: 'apps/web' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'write-openapi-spec',
    type: 'taskNode',
    position: { x: 450, y: 240 },
    data: {
      label: 'Write API Spec', definition: 'generate-openapi-spec', type: 'task', reasoning: 'medium', agent: 'Smith',
      purpose: 'Create an API spec project with a valid OpenAPI 3.0 YAML file.\n\nDefine a Todo schema with: id, title, completed, createdAt.\nDefine endpoints: GET /todos, POST /todos, PUT /todos/{id}, DELETE /todos/{id}.',
      inputs: [{ name: 'project', type: 'string', description: 'Library project name', value: 'api-spec' }, { name: 'specPath', type: 'string', description: 'Output path for the OpenAPI spec', value: 'packages/api-spec/todo.openapi.yaml' }],
      outputs: [{ name: 'specPath', type: 'string', description: 'Path to the generated OpenAPI spec file' }],
      requirements: ['openapi'],
      rules: ['linted', 'conformant'],
      permissions: { tools: ['node', 'npm'] },
    },
  },
  {
    id: 'generate-backend',
    type: 'taskNode',
    position: { x: 750, y: 240 },
    data: { label: 'Generate Backend App', definition: 'generate-app', type: 'command', run: 'npx nx g {generator} {name} --directory={directory}', inputs: [{ name: 'generator', type: 'string', description: 'Nx generator', value: '@nx/node:app' }, { name: 'name', type: 'string', description: 'App name', value: 'api' }, { name: 'directory', type: 'string', description: 'Output directory', value: 'apps/api' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'generate-client-lib',
    type: 'taskNode',
    position: { x: 450, y: 360 },
    data: { label: 'Generate Client Lib', definition: 'generate-library', type: 'command', run: 'npx nx g {generator} {name} --directory={directory}', inputs: [{ name: 'generator', type: 'string', description: 'Nx generator', value: '@nx/js:library' }, { name: 'name', type: 'string', description: 'Library name', value: 'api-client' }, { name: 'directory', type: 'string', description: 'Output directory', value: 'packages/api-client' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'generate-api-client',
    type: 'taskNode',
    position: { x: 450, y: 480 },
    data: { label: 'Generate API Client', definition: 'generate-api-client', type: 'command', run: 'npx @openapitools/openapi-generator-cli generate -i {specPath} -g typescript-fetch -o {outputDir}', inputs: [{ name: 'specPath', type: 'string', description: 'Path to the OpenAPI spec', value: 'packages/api-spec/todo.openapi.yaml' }, { name: 'outputDir', type: 'string', description: 'Output directory for generated client', value: 'packages/api-client/src/generated' }], permissions: { tools: ['node', 'npm', 'java@21'] }, rules: ['successfulBuild'] },
  },
  {
    id: 'implement-backend',
    type: 'taskNode',
    position: { x: 700, y: 480 },
    data: {
      label: 'Implement Backend', definition: 'implement-backend', type: 'task', reasoning: 'high', agent: 'Smith',
      purpose: 'Implement an Express API server for the Todo CRUD API.\n\nCreate main.ts (Express server with CORS, JSON, port 3000), routes/todos.ts (CRUD handlers with in-memory storage), types.ts (Todo interface matching OpenAPI spec).\n\nUse in-memory array, generate UUIDs, return proper HTTP status codes.',
      inputs: [{ name: 'project', type: 'string', description: 'Nx project name for the backend', value: 'api' }, { name: 'specProject', type: 'string', description: 'Nx project containing the OpenAPI spec', value: 'api-spec' }],
      requirements: ['code-generation', 'testing'],
      rules: ['successfulBuild', 'linted'],
      permissions: { tools: ['node', 'npm'] },
    },
  },
  {
    id: 'implement-frontend',
    type: 'taskNode',
    position: { x: 300, y: 620 },
    data: {
      label: 'Implement Frontend', definition: 'implement-frontend', type: 'task', reasoning: 'high', agent: 'Smith',
      purpose: 'Implement a TodoMVC React frontend application.\n\nCreate app.tsx (main component), todo-item.tsx (item with checkbox/delete), todo-input.tsx (add input), use-todos.ts (custom hook fetching from localhost:3000).\n\nFeatures: add, toggle, delete todos, show remaining count.',
      inputs: [{ name: 'project', type: 'string', description: 'Nx project name for the frontend', value: 'web' }, { name: 'clientProject', type: 'string', description: 'Nx project containing the API client', value: 'api-client' }],
      requirements: ['code-generation', 'react', 'testing'],
      rules: ['successfulBuild', 'linted', 'humanApproved'],
      permissions: { tools: ['node', 'npm'] },
    },
  },
];

const defaultEdgeOptions: DefaultEdgeOptions = {
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
  },
};

const initialEdges: Edge[] = [
  { id: 'e-init-react', source: 'init-workspace', target: 'add-react' },
  { id: 'e-init-node', source: 'init-workspace', target: 'add-node' },
  { id: 'e-react-frontend', source: 'add-react', target: 'generate-frontend' },
  { id: 'e-node-spec', source: 'add-node', target: 'write-openapi-spec' },
  { id: 'e-node-backend', source: 'add-node', target: 'generate-backend' },
  { id: 'e-spec-clientlib', source: 'write-openapi-spec', target: 'generate-client-lib' },
  { id: 'e-clientlib-client', source: 'generate-client-lib', target: 'generate-api-client' },
  { id: 'e-spec-implbackend', source: 'write-openapi-spec', target: 'implement-backend' },
  { id: 'e-backend-implbackend', source: 'generate-backend', target: 'implement-backend' },
  { id: 'e-frontend-implfrontend', source: 'generate-frontend', target: 'implement-frontend' },
  { id: 'e-client-implfrontend', source: 'generate-api-client', target: 'implement-frontend' },
];

export function ComposePage() {
  return (
    <ReactFlowProvider>
      <ComposeCanvas />
    </ReactFlowProvider>
  );
}

function ComposeCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { fitView } = useReactFlow();

  // Resize canvas when sidebar opens/closes
  useEffect(() => {
    const timer = setTimeout(() => fitView({ padding: 0.1 }), 50);
    return () => clearTimeout(timer);
  }, [selectedNodeId, fitView]);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeData = (nodeId: string, data: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
    );
  };

  const addNode = (name: string, type: 'task' | 'command', reasoning?: string, dependsOn?: string[]) => {
    const id = String(Date.now());
    const newNode: Node = {
      id,
      type: 'taskNode',
      position: { x: 250, y: (nodes.length + 1) * 150 },
      data: { label: name, type, reasoning: type === 'task' ? reasoning : undefined },
    };
    setNodes((nds) => [...nds, newNode]);

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
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          className="bg-background"
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap className="!bg-card !border-border" nodeColor="#6366f1" />
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
      </div>

      {/* Properties sidebar */}
      {selectedNode && (
        <PropertiesPanel
          node={selectedNode}
          edges={edges}
          allNodes={nodes}
          onUpdate={(data) => updateNodeData(selectedNode.id, data)}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      <AddNodeDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAdd={addNode}
        existingNodes={nodes}
      />
    </div>
  );
}

function PropertiesPanel({
  node,
  edges,
  allNodes,
  onUpdate,
  onClose,
}: {
  node: Node;
  edges: Edge[];
  allNodes: Node[];
  onUpdate: (data: Partial<NodeData>) => void;
  onClose: () => void;
}) {
  const data = node.data as NodeData;
  const isTask = data.type === 'task';
  const incomingEdges = edges.filter((e) => e.target === node.id);
  const outgoingEdges = edges.filter((e) => e.source === node.id);
  const dependsOn = incomingEdges.map((e) => allNodes.find((n) => n.id === e.source)).filter(Boolean);
  const dependents = outgoingEdges.map((e) => allNodes.find((n) => n.id === e.target)).filter(Boolean);

  return (
    <div className="w-80 shrink-0 border-l bg-card overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {isTask ? (
            <ClipboardList className="h-4 w-4 text-blue-500" />
          ) : (
            <Terminal className="h-4 w-4 text-green-500" />
          )}
          <h3 className="font-semibold text-sm">{data.label}</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input
            value={data.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="h-8 text-sm"
          />
        </div>

        {/* Type + Reasoning */}
        <div className="flex gap-2">
          <div className="flex flex-col gap-1.5 flex-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Badge variant="secondary">{data.type}</Badge>
          </div>
          {isTask && (
            <div className="flex flex-col gap-1.5 flex-1">
              <Label className="text-xs text-muted-foreground">Reasoning</Label>
              <Select value={data.reasoning ?? 'medium'} onValueChange={(v) => onUpdate({ reasoning: v })}>
                <SelectTrigger className="h-8 text-sm">
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

        <Separator />

        {/* Purpose / Prompt (tasks) */}
        {isTask && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Prompt</Label>
            <Textarea
              value={data.purpose ?? ''}
              onChange={(e) => onUpdate({ purpose: e.target.value })}
              rows={6}
              className="text-sm"
              placeholder="Describe what the agent should do..."
            />
          </div>
        )}

        {/* Run command (resolved with input values) */}
        {!isTask && data.run && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Run Command</Label>
            <code className="rounded-md border bg-muted px-2 py-1.5 text-xs font-mono whitespace-pre-wrap">
              {resolveTemplate(data.run, data.inputs)}
            </code>
          </div>
        )}

        {/* Inputs */}
        {data.inputs && data.inputs.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Inputs</Label>
              {data.inputs.map((field, idx) => (
                <SchemaFieldInput
                  key={field.name}
                  field={field}
                  onChange={(updated) => {
                    const newInputs = [...data.inputs!];
                    newInputs[idx] = updated;
                    onUpdate({ inputs: newInputs });
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Outputs */}
        {data.outputs && data.outputs.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Outputs</Label>
              {data.outputs.map((field) => (
                <div key={field.name} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">{field.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">{field.type}</Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{field.description}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Requirements (tasks only) */}
        {isTask && data.requirements && data.requirements.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Required Skills</Label>
              <div className="flex flex-wrap gap-1.5">
                {data.requirements.map((req) => (
                  <Badge key={req} variant="default" className="text-xs">{req}</Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Rules */}
        {data.rules && data.rules.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Rules</Label>
              <div className="flex flex-wrap gap-1.5">
                {data.rules.map((rule) => (
                  <Badge key={rule} variant="outline" className="text-xs">{rule}</Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tools */}
        {data.permissions?.tools && data.permissions.tools.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Tools</Label>
              <div className="flex flex-wrap gap-1.5">
                {data.permissions.tools.map((tool) => (
                  <Badge key={tool} variant="secondary" className="text-xs font-mono">{tool}</Badge>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Dependencies */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Depends On</Label>
          {dependsOn.length === 0 ? (
            <span className="text-xs text-muted-foreground">None (root node)</span>
          ) : (
            <div className="flex flex-col gap-1">
              {dependsOn.map((dep) => (
                <span key={dep!.id} className="text-xs">{(dep!.data as NodeData).label}</span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Dependents</Label>
          {dependents.length === 0 ? (
            <span className="text-xs text-muted-foreground">None (leaf node)</span>
          ) : (
            <div className="flex flex-col gap-1">
              {dependents.map((dep) => (
                <span key={dep!.id} className="text-xs">{(dep!.data as NodeData).label}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SchemaFieldInput({
  field,
  onChange,
}: {
  field: SchemaField;
  onChange: (updated: SchemaField) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium">{field.name}</span>
        <Badge variant="outline" className="text-[10px] px-1 py-0">{field.type}</Badge>
      </div>
      <span className="text-[11px] text-muted-foreground">{field.description}</span>
      {field.type === 'string' && (
        <Input
          value={String(field.value ?? '')}
          onChange={(e) => onChange({ ...field, value: e.target.value })}
          className="h-7 text-xs font-mono"
        />
      )}
      {field.type === 'number' && (
        <Input
          type="number"
          value={String(field.value ?? '')}
          onChange={(e) => onChange({ ...field, value: Number(e.target.value) })}
          className="h-7 text-xs font-mono"
        />
      )}
      {field.type === 'boolean' && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={Boolean(field.value)}
            onCheckedChange={(checked) => onChange({ ...field, value: Boolean(checked) })}
          />
          <span className="text-xs">{field.value ? 'true' : 'false'}</span>
        </div>
      )}
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
                    {(node.data as NodeData).label}
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
