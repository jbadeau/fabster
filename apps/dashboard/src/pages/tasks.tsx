import { useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface Task {
  id: string;
  name: string;
  purpose: string;
  reasoning: 'low' | 'medium' | 'high';
  requirements: string[];
  category: string;
  gates: string[];
}

const TASKS: Task[] = [
  {
    id: 'design-openapi-spec',
    name: 'Design OpenAPI Spec',
    purpose: 'Analyze requirements and design an OpenAPI 3.1 specification with schemas, endpoints, error handling, and pagination',
    reasoning: 'medium',
    requirements: ['openapi'],
    category: 'API',
    gates: ['linted', 'conformant'],
  },
  {
    id: 'implement-node-backend',
    name: 'Implement Node Backend',
    purpose: 'Read the API spec, reason about architecture, and implement Express/Fastify endpoints with validation, error handling, and middleware',
    reasoning: 'high',
    requirements: ['node', 'openapi'],
    category: 'Backend',
    gates: ['successfulBuild', 'testsPass', 'linted'],
  },
  {
    id: 'implement-react-frontend',
    name: 'Implement React Frontend',
    purpose: 'Build React components with state management, routing, and API integration based on requirements and design specs',
    reasoning: 'high',
    requirements: ['react', 'nx'],
    category: 'Frontend',
    gates: ['successfulBuild', 'testsPass', 'linted'],
  },
  {
    id: 'write-playwright-tests',
    name: 'Write Playwright Tests',
    purpose: 'Analyze user flows, identify critical paths, and write end-to-end Playwright tests covering happy paths and edge cases',
    reasoning: 'medium',
    requirements: ['playwright', 'react'],
    category: 'Testing',
    gates: ['testsPass', 'linted'],
  },
  {
    id: 'write-react-unit-tests',
    name: 'Write React Unit Tests',
    purpose: 'Analyze React components, identify testable behavior, and write Vitest unit tests with React Testing Library',
    reasoning: 'medium',
    requirements: ['react', 'node'],
    category: 'Testing',
    gates: ['testsPass', 'linted'],
  },
  {
    id: 'write-techdocs',
    name: 'Write TechDocs',
    purpose: 'Author technical documentation including README, API reference, architecture decision records, and onboarding guides',
    reasoning: 'medium',
    requirements: ['docs'],
    category: 'Documentation',
    gates: ['linted'],
  },
  {
    id: 'plan-fabster-workflow',
    name: 'Plan Fabster Workflow',
    purpose: 'Break down a Jira feature into an executable Fabster workflow graph of tasks and commands with proper dependencies and merge request ordering',
    reasoning: 'high',
    requirements: ['planning', 'jira'],
    category: 'Planning',
    gates: ['conformant'],
  },
];

const CATEGORIES = [...new Set(TASKS.map((t) => t.category))];
const REASONING_LEVELS = ['low', 'medium', 'high'] as const;
const ALL_GATES = [...new Set(TASKS.flatMap((t) => t.gates))].sort();

export function TasksPage() {
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedReasoning, setSelectedReasoning] = useState<string[]>([]);
  const [selectedGates, setSelectedGates] = useState<string[]>([]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const toggleReasoning = (level: string) => {
    setSelectedReasoning((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  };

  const toggleGate = (gate: string) => {
    setSelectedGates((prev) =>
      prev.includes(gate) ? prev.filter((g) => g !== gate) : [...prev, gate],
    );
  };

  const filtered = TASKS.filter((task) => {
    if (search && !task.name.toLowerCase().includes(search.toLowerCase()) && !task.purpose.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedCategories.length > 0 && !selectedCategories.includes(task.category)) {
      return false;
    }
    if (selectedReasoning.length > 0 && !selectedReasoning.includes(task.reasoning)) {
      return false;
    }
    if (selectedGates.length > 0 && !selectedGates.some((g) => task.gates.includes(g))) {
      return false;
    }
    return true;
  });

  const hasFilters = selectedCategories.length > 0 || selectedReasoning.length > 0 || selectedGates.length > 0 || search.length > 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Filter sidebar */}
      <div className="w-56 shrink-0 border-r p-4 flex flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
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
            Reasoning
          </Label>
          {REASONING_LEVELS.map((level) => (
            <label key={level} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedReasoning.includes(level)}
                onCheckedChange={() => toggleReasoning(level)}
              />
              {level}
            </label>
          ))}
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Gates
          </Label>
          {ALL_GATES.map((gate) => (
            <label key={gate} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedGates.includes(gate)}
                onCheckedChange={() => toggleGate(gate)}
              />
              {gate}
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
                setSelectedReasoning([]);
                setSelectedGates([]);
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
            {filtered.length} task{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,260px))]">
          {filtered.map((task) => (
            <Card key={task.id} className="flex flex-col">
              <CardHeader className="flex-1">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{task.name}</CardTitle>
                </div>
                <CardDescription className="mt-2 line-clamp-3">
                  {task.purpose}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{task.category}</Badge>
                    <Badge variant="secondary">{task.reasoning}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {task.requirements.map((req) => (
                      <Badge key={req} variant="default" className="text-xs">
                        {req}
                      </Badge>
                    ))}
                  </div>
                  {task.gates.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Gates: {task.gates.join(', ')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
