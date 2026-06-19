import { useMemo, useState } from 'react';
import { Terminal, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
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

export function CommandsPage() {
  const { data, isLoading } = trpc.listCommands.useQuery();
  const commands = useMemo<Command[]>(() => data?.commands ?? [], [data]);

  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const CATEGORIES = useMemo(
    () => [...new Set(commands.map((c) => c.category))].sort(),
    [commands],
  );
  const ALL_TOOLS = useMemo(
    () => [...new Set(commands.flatMap((c) => c.tools))].sort(),
    [commands],
  );

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

  const filtered = commands.filter((cmd) => {
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
            {isLoading
              ? 'Loading commands…'
              : `${filtered.length} command${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,260px))]">
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

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Terminal className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No commands found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {commands.length === 0
                ? 'No plugins with commands are installed'
                : 'Try adjusting your filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
