import { useState } from 'react';
import { Terminal, Search } from 'lucide-react';
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

interface Command {
  id: string;
  name: string;
  description: string;
  run: string;
  category: string;
  tools: string[];
}

const COMMANDS: Command[] = [
  {
    id: 'init-workspace',
    name: 'Init Workspace',
    description: 'Initialize an Nx monorepo with standard tooling and presets',
    run: 'npx create-nx-workspace {name} --preset=apps',
    category: 'Nx',
    tools: ['node', 'npm'],
  },
  {
    id: 'add-plugin',
    name: 'Add Nx Plugin',
    description: 'Install and configure an Nx plugin in the workspace',
    run: 'npx nx add {plugin}',
    category: 'Nx',
    tools: ['node', 'npm'],
  },
  {
    id: 'generate-app',
    name: 'Generate App',
    description: 'Scaffold a new application using an Nx generator',
    run: 'npx nx g {generator} {name} --directory={directory}',
    category: 'Nx',
    tools: ['node', 'npm'],
  },
  {
    id: 'generate-library',
    name: 'Generate Library',
    description: 'Scaffold a new library project using an Nx generator',
    run: 'npx nx g {generator} {name} --directory={directory}',
    category: 'Nx',
    tools: ['node', 'npm'],
  },
  {
    id: 'generate-api-client',
    name: 'Generate API Client',
    description: 'Generate a TypeScript fetch client from an OpenAPI spec',
    run: 'npx @openapitools/openapi-generator-cli generate -i {specPath} -g typescript-fetch -o {outputDir}',
    category: 'OpenAPI',
    tools: ['node', 'npm', 'java@21'],
  },
  {
    id: 'run-build',
    name: 'Run Build',
    description: 'Build affected projects in the workspace',
    run: 'npx nx affected -t build',
    category: 'Nx',
    tools: ['node', 'npm'],
  },
  {
    id: 'run-lint',
    name: 'Run Lint',
    description: 'Lint affected projects in the workspace',
    run: 'npx nx affected -t lint',
    category: 'Nx',
    tools: ['node', 'npm'],
  },
  {
    id: 'run-test',
    name: 'Run Test',
    description: 'Test affected projects in the workspace',
    run: 'npx nx affected -t test',
    category: 'Nx',
    tools: ['node', 'npm'],
  },
];

const CATEGORIES = [...new Set(COMMANDS.map((c) => c.category))];
const ALL_TOOLS = [...new Set(COMMANDS.flatMap((c) => c.tools))].sort();

export function CommandsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  };

  const filtered = COMMANDS.filter((cmd) => {
    if (search && !cmd.name.toLowerCase().includes(search.toLowerCase()) && !cmd.description.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedCategories.length > 0 && !selectedCategories.includes(cmd.category)) {
      return false;
    }
    if (selectedTools.length > 0 && !selectedTools.some((t) => cmd.tools.includes(t))) {
      return false;
    }
    return true;
  });

  const hasFilters = selectedCategories.length > 0 || selectedTools.length > 0 || search.length > 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Filter sidebar */}
      <div className="w-56 shrink-0 border-r p-4 flex flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search commands..."
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
            Tools
          </Label>
          {ALL_TOOLS.map((tool) => (
            <label key={tool} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedTools.includes(tool)}
                onCheckedChange={() => toggleTool(tool)}
              />
              {tool}
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
                setSelectedTools([]);
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
            {filtered.length} command{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((cmd) => (
            <Card key={cmd.id} className="flex flex-col">
              <CardHeader className="flex-1">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{cmd.name}</CardTitle>
                </div>
                <CardDescription className="mt-2 line-clamp-2">
                  {cmd.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col gap-3">
                  <code className="rounded bg-muted px-1.5 py-1 text-xs font-mono text-muted-foreground truncate block">
                    {cmd.run}
                  </code>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{cmd.category}</Badge>
                    {cmd.tools.map((tool) => (
                      <Badge key={tool} variant="secondary" className="text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Terminal className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No commands found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
