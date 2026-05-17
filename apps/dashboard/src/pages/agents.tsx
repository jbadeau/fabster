import { useState } from 'react';
import { Plus, Bot, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface Agent {
  id: string;
  name: string;
  adapter: string;
  purpose: string;
  skills: string[];
}

const AVAILABLE_SKILLS = ['nx', 'openapi', 'react', 'node', 'python', 'docker', 'terraform', 'kubernetes'];
const ADAPTERS = ['claude-code', 'codex', 'gemini-cli', 'custom'];

const INITIAL_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Smith',
    adapter: 'claude-code',
    purpose: 'Full-stack developer agent',
    skills: ['nx', 'openapi', 'react'],
  },
  {
    id: '2',
    name: 'Jones',
    adapter: 'claude-code',
    purpose: 'API specialist agent',
    skills: ['node', 'openapi'],
  },
];

export function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleCreate = (agent: Omit<Agent, 'id'>) => {
    setAgents((prev) => [...prev, { ...agent, id: String(Date.now()) }]);
    setIsCreateOpen(false);
  };

  const handleUpdate = (agent: Agent) => {
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? agent : a)));
    setEditingAgent(null);
  };

  const handleDelete = (id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agents</h2>
          <p className="text-sm text-muted-foreground">
            Configure agents and assign skills
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </DialogTrigger>
          <AgentFormDialog
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
          />
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-muted-foreground" />
                <CardTitle>{agent.name}</CardTitle>
              </div>
              <CardDescription>{agent.purpose}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="text-sm text-muted-foreground">
                  {agent.adapter}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {agent.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Dialog
                open={editingAgent?.id === agent.id}
                onOpenChange={(open) => {
                  if (!open) setEditingAgent(null);
                }}
              >
                <DialogTrigger
                  render={<Button variant="outline" size="sm" />}
                  onClick={() => setEditingAgent(agent)}
                >
                  <Pencil className="mr-2 h-3 w-3" />
                  Edit
                </DialogTrigger>
                {editingAgent?.id === agent.id && (
                  <AgentFormDialog
                    agent={editingAgent}
                    onSubmit={(data) =>
                      handleUpdate({ ...data, id: agent.id })
                    }
                    onCancel={() => setEditingAgent(null)}
                  />
                )}
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(agent.id)}
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bot className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No agents</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first agent to get started
          </p>
        </div>
      )}
    </div>
  );
}

function AgentFormDialog({
  agent,
  onSubmit,
  onCancel,
}: {
  agent?: Agent;
  onSubmit: (data: Omit<Agent, 'id'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(agent?.name ?? '');
  const [adapter, setAdapter] = useState(agent?.adapter ?? 'claude-code');
  const [purpose, setPurpose] = useState(agent?.purpose ?? '');
  const [skills, setSkills] = useState<string[]>(agent?.skills ?? []);

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), adapter, purpose: purpose.trim(), skills });
  };

  return (
    <DialogContent className="sm:max-w-md">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{agent ? 'Edit Agent' : 'New Agent'}</DialogTitle>
          <DialogDescription>
            {agent
              ? 'Update agent configuration and skills'
              : 'Create a new agent and assign skills'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Smith"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Full-stack developer agent"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="adapter">Adapter</Label>
            <Select value={adapter} onValueChange={setAdapter}>
              <SelectTrigger id="adapter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADAPTERS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Skills</Label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_SKILLS.map((skill) => (
                <label
                  key={skill}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={skills.includes(skill)}
                    onCheckedChange={() => toggleSkill(skill)}
                  />
                  {skill}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            {agent ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
