import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { trpc } from '@/lib/trpc';
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
import { Plus, Play, Save, ClipboardList, Terminal as TerminalIcon, X, ChevronDown, ChevronUp, Loader, CircleCheck, CircleX, CircleDot, CircleMinus } from 'lucide-react';
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
  order?: number;
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
  pending: 'border-dashed border-muted-foreground/30',
  running: 'border-blue-500 border-2 shadow-md shadow-blue-500/20',
  complete: 'border-green-600 border-2',
  failed: 'border-red-500 border-2',
  gated: 'border-yellow-500 border-2',
  skipped: 'border-dashed border-muted-foreground/20',
};

const STATUS_ICON: Record<ExecutionStatus, React.ReactNode> = {
  pending: <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />,
  running: <Loader className="h-3 w-3 animate-spin text-blue-500" />,
  complete: <CircleCheck className="h-3 w-3 text-green-600" />,
  failed: <CircleX className="h-3 w-3 text-red-500" />,
  gated: <CircleDot className="h-3 w-3 text-yellow-500" />,
  skipped: <CircleMinus className="h-3 w-3 text-muted-foreground/40" />,
};

// Custom node component
function TaskNode({ data, selected }: { data: NodeData; selected?: boolean }) {
  const isTask = data.type === 'task';
  const isPending = data.status === 'pending' || data.status === 'skipped';
  const statusBorder = data.status ? STATUS_BORDER[data.status] : 'border-border/50';
  return (
    <div className={`rounded-md border p-3 shadow-xs w-[200px] relative ${statusBorder} ${isPending ? 'bg-muted opacity-50' : 'bg-card'} ${selected ? 'ring-1 ring-primary' : ''}`}>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      {data.order != null && (
        <div className="absolute -top-2.5 -right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {data.order}
        </div>
      )}
      <div className="flex items-center gap-2">
        {data.status && STATUS_ICON[data.status]}
        {isTask ? (
          <ClipboardList className={`h-3.5 w-3.5 shrink-0 ${isPending ? 'text-muted-foreground' : 'text-foreground'}`} />
        ) : (
          <TerminalIcon className={`h-3.5 w-3.5 shrink-0 ${isPending ? 'text-muted-foreground' : 'text-foreground'}`} />
        )}
        <span className="text-xs font-medium">{data.label}</span>
      </div>
      <div className="ml-[1.65rem] text-xs text-muted-foreground">{data.definition}</div>
      {isTask && (
        <div className="mt-1.5 ml-[1.65rem] flex items-center gap-1.5 text-xs text-muted-foreground">
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

// TodoMVC workflow — DAG with linear execution order
const initialNodes: Node[] = [
  {
    id: 'init-workspace',
    type: 'taskNode',
    position: { x: 350, y: 0 },
    data: { label: 'Init Workspace', definition: 'nx:init-workspace', type: 'command', order: 1, run: 'npx create-nx-workspace {name} --preset=apps --ci=skip --nx-cloud=skip', inputs: [{ name: 'name', type: 'string', description: 'Workspace name', value: 'todomvc' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'add-react',
    type: 'taskNode',
    position: { x: 100, y: 120 },
    data: { label: 'Add React Plugin', definition: 'nx:add-plugin', type: 'command', order: 2, run: 'npx nx add {plugin}', inputs: [{ name: 'plugin', type: 'string', description: 'Nx plugin package', value: '@nx/react' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'add-node',
    type: 'taskNode',
    position: { x: 600, y: 120 },
    data: { label: 'Add Node Plugin', definition: 'nx:add-plugin', type: 'command', order: 3, run: 'npx nx add {plugin}', inputs: [{ name: 'plugin', type: 'string', description: 'Nx plugin package', value: '@nx/node' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'generate-frontend',
    type: 'taskNode',
    position: { x: 100, y: 240 },
    data: { label: 'Generate Frontend App', definition: 'nx:generate-app', type: 'command', order: 4, run: 'npx nx g {generator} {name} --directory={directory}', inputs: [{ name: 'generator', type: 'string', description: 'Nx generator', value: '@nx/react:app' }, { name: 'name', type: 'string', description: 'App name', value: 'web' }, { name: 'directory', type: 'string', description: 'Output directory', value: 'apps/web' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'write-openapi-spec',
    type: 'taskNode',
    position: { x: 450, y: 240 },
    data: {
      label: 'Write API Spec', definition: 'openapi:generate-spec', type: 'task', order: 5, reasoning: 'medium', agent: 'Dozer',
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
    data: { label: 'Generate Backend App', definition: 'nx:generate-app', type: 'command', order: 6, run: 'npx nx g {generator} {name} --directory={directory}', inputs: [{ name: 'generator', type: 'string', description: 'Nx generator', value: '@nx/node:app' }, { name: 'name', type: 'string', description: 'App name', value: 'api' }, { name: 'directory', type: 'string', description: 'Output directory', value: 'apps/api' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'generate-client-lib',
    type: 'taskNode',
    position: { x: 450, y: 360 },
    data: { label: 'Generate Client Lib', definition: 'nx:generate-library', type: 'command', order: 7, run: 'npx nx g {generator} {name} --directory={directory}', inputs: [{ name: 'generator', type: 'string', description: 'Nx generator', value: '@nx/js:library' }, { name: 'name', type: 'string', description: 'Library name', value: 'api-client' }, { name: 'directory', type: 'string', description: 'Output directory', value: 'packages/api-client' }], permissions: { tools: ['node', 'npm'] } },
  },
  {
    id: 'generate-api-client',
    type: 'taskNode',
    position: { x: 450, y: 480 },
    data: { label: 'Generate API Client', definition: 'openapi:generate-client', type: 'command', order: 8, run: 'npx @openapitools/openapi-generator-cli generate -i {specPath} -g typescript-fetch -o {outputDir}', inputs: [{ name: 'specPath', type: 'string', description: 'Path to the OpenAPI spec', value: 'packages/api-spec/todo.openapi.yaml' }, { name: 'outputDir', type: 'string', description: 'Output directory for generated client', value: 'packages/api-client/src/generated' }], permissions: { tools: ['node', 'npm', 'java@21'] }, rules: ['successfulBuild'] },
  },
  {
    id: 'implement-backend',
    type: 'taskNode',
    position: { x: 700, y: 480 },
    data: {
      label: 'Implement Backend', definition: 'code:implement-backend', type: 'task', order: 9, reasoning: 'high', agent: 'Tank',
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
      label: 'Implement Frontend', definition: 'code:implement-frontend', type: 'task', order: 10, reasoning: 'high', agent: 'Trinity',
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

interface ServerNode {
  id: string;
  name: string;
  kind: string;
  purpose: string;
  state: string;
  inputs?: { name: string; kind: string; description?: string; value?: string | number | boolean }[];
  outputs?: { name: string; kind: string; description?: string }[];
  steps?: string[];
  requirements?: string[];
  instructions?: string[];
  rules?: string[];
  reasoning?: string;
  permissions?: { fs?: { read?: string[]; write?: string[] }; tools?: string[]; network?: string[]; secrets?: string[] };
  gates?: string[];
}

function autoLayoutDAG(
  serverNodes: ServerNode[],
  serverEdges: { id: string; source: string; target: string }[],
): { nodes: Node[]; edges: Edge[] } {
  // Build adjacency for topological layering
  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const n of serverNodes) {
    inDegree.set(n.id, 0);
    children.set(n.id, []);
  }
  for (const e of serverEdges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    children.get(e.source)?.push(e.target);
  }

  // Assign layers via BFS (topological order)
  const layers = new Map<string, number>();
  const queue = serverNodes.filter(n => (inDegree.get(n.id) ?? 0) === 0).map(n => n.id);
  for (const id of queue) layers.set(id, 0);

  let i = 0;
  while (i < queue.length) {
    const current = queue[i++];
    const layer = layers.get(current) ?? 0;
    for (const child of (children.get(current) ?? [])) {
      const newLayer = Math.max(layers.get(child) ?? 0, layer + 1);
      layers.set(child, newLayer);
      if (!queue.includes(child)) queue.push(child);
    }
  }

  // Group nodes by layer and position them
  const layerGroups = new Map<number, string[]>();
  for (const [id, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(id);
  }

  const NODE_WIDTH = 220;
  const LAYER_GAP = 140;
  const NODE_GAP = 40;

  const nodeMap = new Map(serverNodes.map(n => [n.id, n]));
  const nodes: Node[] = [];
  let orderCounter = 1;

  for (const [layer, ids] of [...layerGroups.entries()].sort((a, b) => a[0] - b[0])) {
    const totalWidth = ids.length * NODE_WIDTH + (ids.length - 1) * NODE_GAP;
    const startX = -totalWidth / 2 + NODE_WIDTH / 2;

    ids.forEach((id, idx) => {
      const sn = nodeMap.get(id)!;
      nodes.push({
        id,
        type: 'taskNode',
        position: { x: startX + idx * (NODE_WIDTH + NODE_GAP), y: layer * LAYER_GAP },
        data: {
          label: sn.name.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          definition: sn.name,
          type: sn.kind as 'task' | 'command',
          order: orderCounter++,
          purpose: sn.purpose,
          reasoning: sn.reasoning,
          run: sn.steps?.join(' && '),
          inputs: sn.inputs?.map((inp) => ({
            name: inp.name,
            type: inp.kind as 'string' | 'number' | 'boolean',
            description: inp.description ?? '',
            value: inp.value,
          })),
          outputs: sn.outputs?.map((out) => ({
            name: out.name,
            type: out.kind as 'string' | 'number' | 'boolean',
            description: out.description ?? '',
          })),
          agent: sn.agent,
          requirements: sn.requirements,
          rules: sn.rules ?? sn.gates,
          permissions: sn.permissions ? { tools: sn.permissions.tools } : undefined,
        },
      });
    });
  }

  const edges: Edge[] = serverEdges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));

  return { nodes, edges };
}


export function WorkflowPage() {
  const { runId } = useParams();
  return (
    <ReactFlowProvider>
      <ComposeCanvas runId={runId} />
    </ReactFlowProvider>
  );
}

function ComposeCanvas({ runId }: { runId?: string }) {
  const { data: runData } = trpc.getRun.useQuery(
    { runId: runId! },
    { enabled: !!runId, refetchInterval: 2000 },
  );

  const runStates = useMemo(() => {
    if (!runData?.nodes) return undefined;
    const states: Record<string, ExecutionStatus> = {};
    for (const n of runData.nodes) {
      const stateMap: Record<string, ExecutionStatus> = {
        'pending': 'pending',
        'executing': 'running',
        'validating': 'running',
        'publishing': 'running',
        'reviewing': 'running',
        'retrying': 'running',
        'complete': 'complete',
        'failed': 'failed',
        'gated': 'gated',
        'skipped': 'skipped',
      };
      states[n.id] = stateMap[n.state] ?? 'pending';
    }
    return states;
  }, [runData]);

  const isExecutionMode = Boolean(runStates);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when server data arrives (execution mode with DAG from server)
  useEffect(() => {
    if (runData?.nodes && runData?.edges) {
      const layout = autoLayoutDAG(runData.nodes, runData.edges);
      setNodes(layout.nodes);
      setEdges(layout.edges);
    }
  }, [runData?.nodes?.length, setNodes, setEdges]); // Only re-layout when node count changes

  // Build agent map from server data
  const agentMap = useMemo(() => {
    if (!runData?.nodes) return {};
    const map: Record<string, string> = {};
    for (const n of runData.nodes) {
      if (n.agent) map[n.id] = n.agent;
    }
    return map;
  }, [runData]);

  // Apply execution states and agent assignments to nodes
  const nodesWithState = useMemo(() => {
    if (!runStates) return nodes;
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        status: runStates[n.id] ?? 'pending',
        agent: agentMap[n.id] ?? n.data.agent,
      },
    }));
  }, [runStates, agentMap, nodes]);

  // Style edges based on target node status
  const edgesWithState = useMemo(() => {
    if (!runStates) return edges;
    return edges.map((e) => {
      const targetStatus = runStates[e.target];
      if (targetStatus === 'pending' || targetStatus === 'skipped') {
        return { ...e, style: { opacity: 0.2 } };
      }
      return e;
    });
  }, [runStates, edges]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(!!runId);
  const { fitView } = useReactFlow();

  // Fit view on initial load only
  useEffect(() => {
    const timer = setTimeout(() => fitView({ padding: 0.1 }), 100);
    return () => clearTimeout(timer);
  }, [fitView]);


  const selectedNode = selectedNodeId ? nodesWithState.find((n) => n.id === selectedNodeId) : null;

  const { data: logsData } = trpc.getNodeLogs.useQuery(
    { runId: runId!, nodeId: selectedNodeId! },
    { enabled: !!runId && !!selectedNodeId, refetchInterval: 2000 },
  );
  const nodeLogs = logsData?.logs ?? [];

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
    if (!isExecutionMode) setSelectedNodeId(null);
  }, [isExecutionMode]);

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
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex-1 min-h-0 relative">
        <ReactFlow
          nodes={nodesWithState}
          edges={edgesWithState}
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
        {isExecutionMode && (
          <div className="shrink-0 border-t bg-card flex flex-col h-64">
            <button
              onClick={() => setLogsOpen((o) => !o)}
              className="flex shrink-0 items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <TerminalIcon className="h-3 w-3" />
                <span>{selectedNode ? `Logs — ${(selectedNode.data as NodeData).label}` : 'Logs — click a node'}</span>
              </div>
              {logsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </button>
            {logsOpen && (
              <div className="flex-1 overflow-y-scroll px-4 py-2 font-mono text-xs border-t">
                {!selectedNode ? (
                  <span className="text-muted-foreground">Click a node to see its logs</span>
                ) : nodeLogs.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {nodeLogs.map((line, i) => (
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
        existingNodes={nodesWithState}
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
    <div className="w-[20%] min-w-[280px] shrink-0 border-l overflow-y-auto bg-card h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {isTask ? (
            <ClipboardList className="h-4 w-4 text-foreground" />
          ) : (
            <TerminalIcon className="h-4 w-4 text-foreground" />
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
  if (line.startsWith('[tool]')) return 'text-foreground';
  if (line.startsWith('[text]')) return 'text-foreground';
  if (line.startsWith('[done]') || line.startsWith('[complete]')) return 'text-foreground';
  if (line.startsWith('ERROR') || line.startsWith('[failed]')) return 'text-foreground';
  if (line.startsWith('>')) return 'text-foreground';
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
