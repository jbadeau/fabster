import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
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
import { Plus, Play, Save, ClipboardList, Terminal as TerminalIcon, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

type ExecutionStatus = 'pending' | 'running' | 'complete' | 'failed' | 'gated' | 'skipped';

// Node data shape
interface NodeData {
  label: string;
  definition: string;
  type: 'task' | 'command';
  reasoning?: string;
  agent?: string;
  purpose?: string;
  run?: string;
  status?: ExecutionStatus;
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

const STATUS_BORDER: Record<ExecutionStatus, string> = {
  pending: 'border-dashed border-muted-foreground/40 animate-pulse',
  running: 'border-blue-500 border-2 animate-pulse',
  complete: 'border-green-500',
  failed: 'border-red-500',
  gated: 'border-yellow-500',
  skipped: 'border-dashed border-border/30',
};

// Custom node component
function TaskNode({ data, selected }: { data: NodeData; selected?: boolean }) {
  const isTask = data.type === 'task';
  const isPending = data.status === 'pending' || data.status === 'skipped';
  const statusBorder = data.status ? STATUS_BORDER[data.status] : 'border-border/50';
  return (
    <div className={`rounded-md border p-3 shadow-xs w-[200px] relative ${statusBorder} ${isPending ? 'bg-muted opacity-50' : 'bg-card'} ${selected ? 'ring-1 ring-primary' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <div className="flex items-center gap-2">
        {isTask ? (
          <ClipboardList className={`h-4 w-4 shrink-0 ${isPending ? 'text-muted-foreground' : 'text-blue-500'}`} />
        ) : (
          <TerminalIcon className={`h-4 w-4 shrink-0 ${isPending ? 'text-muted-foreground' : 'text-green-500'}`} />
        )}
        <span className="text-xs font-medium">{data.label}</span>
      </div>
      <div className="ml-6 text-xs text-muted-foreground">{data.definition}</div>
      {isTask && (
        <div className="mt-1.5 ml-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          {data.agent && (
            <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${data.agent}`} alt={data.agent} className="h-5 w-5" />
          )}
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
    data: { label: 'Init Workspace', definition: 'nx:init-workspace', type: 'command', run: 'npx create-nx-workspace {name} --preset=apps --ci=skip --nx-cloud=skip', inputs: [{ name: 'name', type: 'string', description: 'Workspace name', value: 'todomvc' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'add-react',
    type: 'taskNode',
    position: { x: 100, y: 120 },
    data: { label: 'Add React Plugin', definition: 'nx:add-plugin', type: 'command', run: 'npx nx add {plugin}', inputs: [{ name: 'plugin', type: 'string', description: 'Nx plugin package', value: '@nx/react' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'add-node',
    type: 'taskNode',
    position: { x: 600, y: 120 },
    data: { label: 'Add Node Plugin', definition: 'nx:add-plugin', type: 'command', run: 'npx nx add {plugin}', inputs: [{ name: 'plugin', type: 'string', description: 'Nx plugin package', value: '@nx/node' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'generate-frontend',
    type: 'taskNode',
    position: { x: 100, y: 240 },
    data: { label: 'Generate Frontend App', definition: 'nx:generate-app', type: 'command', run: 'npx nx g {generator} {name} --directory={directory}', inputs: [{ name: 'generator', type: 'string', description: 'Nx generator', value: '@nx/react:app' }, { name: 'name', type: 'string', description: 'App name', value: 'web' }, { name: 'directory', type: 'string', description: 'Output directory', value: 'apps/web' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'write-openapi-spec',
    type: 'taskNode',
    position: { x: 450, y: 240 },
    data: {
      label: 'Write API Spec', definition: 'openapi:generate-spec', type: 'task', reasoning: 'medium', agent: 'Dozer',
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
    data: { label: 'Generate Backend App', definition: 'nx:generate-app', type: 'command', run: 'npx nx g {generator} {name} --directory={directory}', inputs: [{ name: 'generator', type: 'string', description: 'Nx generator', value: '@nx/node:app' }, { name: 'name', type: 'string', description: 'App name', value: 'api' }, { name: 'directory', type: 'string', description: 'Output directory', value: 'apps/api' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'generate-client-lib',
    type: 'taskNode',
    position: { x: 450, y: 360 },
    data: { label: 'Generate Client Lib', definition: 'nx:generate-library', type: 'command', run: 'npx nx g {generator} {name} --directory={directory}', inputs: [{ name: 'generator', type: 'string', description: 'Nx generator', value: '@nx/js:library' }, { name: 'name', type: 'string', description: 'Library name', value: 'api-client' }, { name: 'directory', type: 'string', description: 'Output directory', value: 'packages/api-client' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'generate-api-client',
    type: 'taskNode',
    position: { x: 450, y: 480 },
    data: { label: 'Generate API Client', definition: 'openapi:generate-client', type: 'command', run: 'npx @openapitools/openapi-generator-cli generate -i {specPath} -g typescript-fetch -o {outputDir}', inputs: [{ name: 'specPath', type: 'string', description: 'Path to the OpenAPI spec', value: 'packages/api-spec/todo.openapi.yaml' }, { name: 'outputDir', type: 'string', description: 'Output directory for generated client', value: 'packages/api-client/src/generated' }], permissions: { tools: ['node', 'npm', 'java@21'] }, rules: ['successfulBuild'] },
  },
  {
    id: 'implement-backend',
    type: 'taskNode',
    position: { x: 700, y: 480 },
    data: {
      label: 'Implement Backend', definition: 'code:implement-backend', type: 'task', reasoning: 'high', agent: 'Tank',
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
      label: 'Implement Frontend', definition: 'code:implement-frontend', type: 'task', reasoning: 'high', agent: 'Trinity',
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
    width: 8,
    height: 8,
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

// Mock execution states for runs
// Mock execution states — each matches the parallelized DAG
const MOCK_RUN_STATES: Record<string, Record<string, ExecutionStatus>> = {
  // Running: init done, plugins done, 3 parallel nodes executing
  run_1715961600: {
    'init-workspace': 'complete',
    'add-react': 'complete',
    'add-node': 'complete',
    'generate-frontend': 'running',
    'write-openapi-spec': 'running',
    'generate-backend': 'running',
    'generate-client-lib': 'pending',
    'generate-api-client': 'pending',
    'implement-backend': 'pending',
    'implement-frontend': 'pending',
  },
  // Success: all nodes complete
  run_1715954400: {
    'init-workspace': 'complete',
    'add-react': 'complete',
    'add-node': 'complete',
    'generate-frontend': 'complete',
    'write-openapi-spec': 'complete',
    'generate-backend': 'complete',
    'generate-client-lib': 'complete',
    'generate-api-client': 'complete',
    'implement-backend': 'complete',
    'implement-frontend': 'complete',
  },
  // Failed: api-client generation failed, downstream skipped
  run_1715947200: {
    'init-workspace': 'complete',
    'add-react': 'complete',
    'add-node': 'complete',
    'generate-frontend': 'complete',
    'write-openapi-spec': 'complete',
    'generate-backend': 'complete',
    'generate-client-lib': 'complete',
    'generate-api-client': 'failed',
    'implement-backend': 'complete',
    'implement-frontend': 'skipped',
  },
};

// Mock logs for nodes that have executed
const MOCK_NODE_LOGS: Record<string, string[]> = {
  'init-workspace': ['> npx create-nx-workspace todomvc --preset=apps', '[complete] Workspace created'],
  'add-react': ['> npx nx add @nx/react', '[complete] Plugin added'],
  'add-node': ['> npx nx add @nx/node', '[complete] Plugin added'],
  'generate-frontend': ['> npx nx g @nx/react:app web --directory=apps/web', '[complete] App generated'],
  'write-openapi-spec': [
    '[text] Analyzing requirements for Todo API...',
    '[text] Designing OpenAPI 3.0 specification',
    '[tool] writeFile /repo/packages/api-spec/project.json',
    '[text] Creating project.json with name: api-spec, sourceRoot: packages/api-spec',
    '[tool] writeFile /repo/packages/api-spec/todo.openapi.yaml',
    '[text] Defining Todo schema: id (string), title (string), completed (boolean), createdAt (string)',
    '[text] Adding GET /todos endpoint with pagination parameters',
    '[text] Adding POST /todos endpoint with request body validation',
    '[text] Adding PUT /todos/{id} endpoint for updates',
    '[text] Adding DELETE /todos/{id} endpoint',
    '[text] Adding error responses: 400, 404, 500',
    '[text] Adding components/schemas for Todo, CreateTodoRequest, UpdateTodoRequest',
    '[tool] readFile /repo/packages/api-spec/todo.openapi.yaml',
    '[text] Validating spec structure... all paths have required schema keys',
    '[text] Checking response definitions... valid',
    '[text] Verifying component references... all $ref paths resolve',
    '[done] Agent finished — wrote 2 files',
  ],
  'generate-backend': ['> npx nx g @nx/node:app api --directory=apps/api', '[complete] App generated'],
  'generate-client-lib': ['> npx nx g @nx/js:library api-client --directory=packages/api-client', '[complete] Library generated'],
  'generate-api-client': ['> npx @openapitools/openapi-generator-cli generate -i packages/api-spec/todo.openapi.yaml -g typescript-fetch -o packages/api-client/src/generated', 'ERROR: Schema validation failed — missing required field "schema" in response definition'],
  'implement-backend': [
    '[text] Reading API spec from /repo/packages/api-spec/todo.openapi.yaml',
    '[text] Analyzing endpoints: 4 routes, 1 schema, CRUD operations',
    '[tool] writeFile /repo/apps/api/src/types.ts',
    '[text] Created Todo interface matching OpenAPI schema',
    '[tool] writeFile /repo/apps/api/src/routes/todos.ts',
    '[text] Implementing GET /todos — returns all todos from in-memory array',
    '[text] Implementing POST /todos — generates UUID, validates body, returns 201',
    '[text] Implementing PUT /todos/{id} — finds by ID, merges updates, returns 200 or 404',
    '[text] Implementing DELETE /todos/{id} — removes from array, returns 204 or 404',
    '[tool] writeFile /repo/apps/api/src/main.ts',
    '[text] Express server with CORS, JSON body parser, listening on port 3000',
    '[text] Registered routes: /todos (GET, POST), /todos/:id (PUT, DELETE)',
    '> npx nx build api',
    '[text] Build successful — 0 errors, 0 warnings',
    '[done] Agent finished — wrote 3 files',
  ],
  'implement-frontend': [
    '[text] Exploring /repo/apps/web/src/ project structure',
    '[tool] listDirectory /repo/apps/web/src/app/',
    '[tool] writeFile /repo/apps/web/src/app/use-todos.ts',
    '[text] Custom hook: fetches todos from http://localhost:3000/todos',
    '[text] Implements create, toggle, delete with optimistic updates',
    '[tool] writeFile /repo/apps/web/src/app/todo-input.tsx',
    '[text] Input component with form submit handler',
    '[tool] writeFile /repo/apps/web/src/app/todo-item.tsx',
    '[text] Todo item with checkbox toggle and delete button',
    '[tool] writeFile /repo/apps/web/src/app/app.tsx',
    '[text] Main App component composing TodoInput + TodoItem list',
    '[text] Shows remaining count, filters by completion status',
    '> npx nx build web',
    '[text] Build successful — 0 errors, 0 warnings',
    '[done] Agent finished — wrote 4 files',
  ],
};

export function WorkflowPage() {
  const { runId } = useParams();
  return (
    <ReactFlowProvider>
      <ComposeCanvas runId={runId} />
    </ReactFlowProvider>
  );
}

function ComposeCanvas({ runId }: { runId?: string }) {
  const runStates = runId ? MOCK_RUN_STATES[runId] : undefined;
  const isExecutionMode = Boolean(runStates);

  // Apply execution states to nodes
  const nodesWithState = useMemo(() => {
    if (!runStates) return initialNodes;
    return initialNodes.map((n) => ({
      ...n,
      data: { ...n.data, status: runStates[n.id] ?? 'pending' },
    }));
  }, [runStates]);

  // Style edges based on target node status
  const edgesWithState = useMemo(() => {
    if (!runStates) return initialEdges;
    return initialEdges.map((e) => {
      const targetStatus = runStates[e.target];
      const sourceStatus = runStates[e.source];
      if (targetStatus === 'running') {
        return { ...e, animated: true };
      }
      if (targetStatus === 'pending') {
        return { ...e, style: { opacity: 0.3 } };
      }
      return e;
    });
  }, [runStates]);

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithState);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesWithState);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
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
    if (isExecutionMode) setLogsOpen(true);
  }, [isExecutionMode]);

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
    <>
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
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
            {!isExecutionMode && (
              <>
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
              </>
            )}
          </Panel>
        </ReactFlow>
        </div>

        {/* Bottom log panel (under canvas only, not sidebar) */}
        {isExecutionMode && selectedNode && (
          <div className={`shrink-0 border-t bg-card flex flex-col ${logsOpen ? 'h-64' : ''}`}>
            <button
              onClick={() => setLogsOpen((o) => !o)}
              className="flex shrink-0 items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <TerminalIcon className="h-3 w-3" />
                <span>Logs — {(selectedNode.data as NodeData).label}</span>
              </div>
              {logsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </button>
            {logsOpen && (
              <div className="flex-1 overflow-y-scroll px-4 py-2 font-mono text-xs border-t">
                {(MOCK_NODE_LOGS[selectedNode.id] ?? []).length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {(MOCK_NODE_LOGS[selectedNode.id] ?? []).map((line, i) => (
                      <span key={i} className={logColor(line)}>{line}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No logs yet</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Properties sidebar */}
      {selectedNode && (
        <PropertiesPanel
          node={selectedNode}
          onUpdate={(data) => updateNodeData(selectedNode.id, data)}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

    </div>

      <AddNodeDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAdd={addNode}
        existingNodes={nodes}
      />
    </>
  );
}

function PropertiesPanel({
  node,
  onUpdate,
  onClose,
}: {
  node: Node;
  onUpdate: (data: Partial<NodeData>) => void;
  onClose: () => void;
}) {
  const data = node.data as NodeData;
  const isTask = data.type === 'task';

  return (
    <div className="w-[20%] min-w-[280px] shrink-0 border-l overflow-y-auto bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {isTask ? (
            <ClipboardList className="h-4 w-4 text-blue-500" />
          ) : (
            <TerminalIcon className="h-4 w-4 text-green-500" />
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
          {isTask && data.reasoning && (
            <div className="flex flex-col gap-1.5 flex-1">
              <Label className="text-xs text-muted-foreground">Reasoning</Label>
              <Badge variant="outline">{data.reasoning}</Badge>
            </div>
          )}
        </div>

        {/* Agent */}
        {isTask && data.agent && (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${data.agent}`} alt={data.agent} />
              <AvatarFallback className="text-[10px]">
                {data.agent.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label className="text-xs text-muted-foreground">Assigned to</Label>
              <p className="text-sm font-medium">{data.agent}</p>
            </div>
          </div>
        )}

        <Separator />

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

        {/* Purpose / Prompt (tasks, after inputs) */}
        {isTask && (
          <>
            <Separator />
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
          </>
        )}

        {/* Run command (resolved with input values, after inputs) */}
        {!isTask && data.run && (
          <>
            <Separator />
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Run Command</Label>
              <code className="rounded-md border bg-muted px-2 py-1.5 text-xs font-mono whitespace-pre-wrap">
                {resolveTemplate(data.run, data.inputs)}
              </code>
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

function logColor(line: string): string {
  if (line.startsWith('[tool]')) return 'text-purple-500';
  if (line.startsWith('[text]')) return 'text-foreground';
  if (line.startsWith('[done]') || line.startsWith('[complete]')) return 'text-green-500';
  if (line.startsWith('ERROR') || line.startsWith('[failed]')) return 'text-destructive';
  if (line.startsWith('>')) return 'text-cyan-500';
  return 'text-muted-foreground';
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
