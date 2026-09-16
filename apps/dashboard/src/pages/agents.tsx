import { useMemo, useState } from 'react';
import { Bot, Search, Terminal, Wrench } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface Agent {
  id: string;
  slug: string;
  name: string;
  kind: 'native' | 'external';
  role: string;
  goal: string;
  backstory: string;
  capabilities: {
    namespace: string;
    attributes: Record<string, string | number | boolean | string[]>;
  }[];
  memory?: boolean;
  allowDelegation?: boolean;
  tools?: string[];
  adapter?: { command: string; args?: string[]; timeoutMs?: number };
  category: string;
  provider: string;
}

const KINDS = ['native', 'external'] as const;

function capabilityLabel(cap: Agent['capabilities'][number]): string {
  return typeof cap.attributes.name === 'string' ? cap.attributes.name : cap.namespace;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function AgentsPage() {
  const { data, isLoading } = trpc.listAgents.useQuery();
  const agents = useMemo<Agent[]>(() => data?.agents ?? [], [data]);

  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedKinds, setSelectedKinds] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const CATEGORIES = useMemo(
    () => [...new Set(agents.map((a) => a.category))].sort(),
    [agents],
  );
  const ALL_SKILLS = useMemo(
    () => [...new Set(agents.flatMap((a) => a.capabilities.map(capabilityLabel)))].sort(),
    [agents],
  );

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (value: string) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };
  const toggleCategory = toggle(setSelectedCategories);
  const toggleKind = toggle(setSelectedKinds);
  const toggleSkill = toggle(setSelectedSkills);

  const filtered = agents.filter((agent) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !agent.name.toLowerCase().includes(q) &&
        !agent.role.toLowerCase().includes(q) &&
        !agent.goal.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (selectedCategories.length > 0 && !selectedCategories.includes(agent.category)) {
      return false;
    }
    if (selectedKinds.length > 0 && !selectedKinds.includes(agent.kind)) {
      return false;
    }
    if (
      selectedSkills.length > 0 &&
      !selectedSkills.some((s) => agent.capabilities.map(capabilityLabel).includes(s))
    ) {
      return false;
    }
    return true;
  });

  const hasFilters =
    selectedCategories.length > 0 ||
    selectedKinds.length > 0 ||
    selectedSkills.length > 0 ||
    search.length > 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Filter sidebar */}
      <div className="w-56 shrink-0 border-r p-4 flex flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Category
          </Label>
          {CATEGORIES.map((cat) => (
            <label key={cat} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedCategories.includes(cat)}
                onCheckedChange={() => toggleCategory(cat)}
              />
              {cat}
            </label>
          ))}
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Kind
          </Label>
          {KINDS.map((kind) => (
            <label key={kind} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedKinds.includes(kind)}
                onCheckedChange={() => toggleKind(kind)}
              />
              {kind}
            </label>
          ))}
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Skills
          </Label>
          {ALL_SKILLS.map((skill) => (
            <label key={skill} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedSkills.includes(skill)}
                onCheckedChange={() => toggleSkill(skill)}
              />
              {skill}
            </label>
          ))}
        </div>

        {hasFilters && (
          <>
            <Separator />
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategories([]);
                setSelectedKinds([]);
                setSelectedSkills([]);
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </button>
          </>
        )}
      </div>

      {/* Card grid */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Loading agents…'
              : `${filtered.length} agent${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          {filtered.map((agent) => (
            <Card key={agent.id} className="overflow-hidden w-[300px]">
              <CardContent className="pt-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage
                      src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(agent.name)}`}
                      alt={agent.name}
                    />
                    <AvatarFallback>{initials(agent.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">{agent.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{agent.role}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {agent.kind === 'native' ? (
                          <><Bot className="h-3 w-3" /> native</>
                        ) : (
                          <><Terminal className="h-3 w-3" /> {agent.adapter?.command ?? 'external'}</>
                        )}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{agent.category}</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Goal */}
                <p className="text-sm text-muted-foreground line-clamp-3">{agent.goal}</p>

                {/* Skills (provided capabilities) */}
                <div className="flex flex-wrap gap-1.5">
                  {agent.capabilities.map((cap, i) => (
                    <Badge key={i} variant="secondary">
                      {capabilityLabel(cap)}
                    </Badge>
                  ))}
                </div>

                {/* Tools (native agents) */}
                {agent.tools && agent.tools.length > 0 && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Wrench className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{agent.tools.join(', ')}</span>
                  </div>
                )}

                {/* Flags */}
                {(agent.memory || agent.allowDelegation) && (
                  <div className="flex flex-wrap gap-1.5">
                    {agent.memory && <Badge variant="outline" className="text-[10px]">memory</Badge>}
                    {agent.allowDelegation && (
                      <Badge variant="outline" className="text-[10px]">delegation</Badge>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">{agent.provider}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No agents found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {agents.length === 0
                ? 'No plugins with agents are installed'
                : 'Try adjusting your filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
