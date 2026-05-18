import { useState } from 'react';
import { Sparkles, Search } from 'lucide-react';
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

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  provider: string;
}

const SKILLS: Skill[] = [
  {
    id: 'nx',
    name: 'Nx',
    description: 'Nx monorepo tooling — generators, executors, and workspace management',
    category: 'Build Tools',
    tags: ['monorepo', 'build', 'generators'],
    provider: '@fabster/skill-nx',
  },
  {
    id: 'openapi',
    name: 'OpenAPI',
    description: 'Generate and validate OpenAPI specifications and API clients',
    category: 'API',
    tags: ['api', 'codegen', 'rest'],
    provider: '@fabster/skill-openapi',
  },
  {
    id: 'react',
    name: 'React',
    description: 'React component development, hooks, and state management patterns',
    category: 'Frontend',
    tags: ['ui', 'components', 'hooks'],
    provider: '@fabster/skill-react',
  },
  {
    id: 'node',
    name: 'Node.js',
    description: 'Node.js backend development, Express, Fastify, and API patterns',
    category: 'Backend',
    tags: ['server', 'api', 'runtime'],
    provider: '@fabster/skill-node',
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Python development, FastAPI, data processing, and scripting',
    category: 'Backend',
    tags: ['server', 'scripting', 'data'],
    provider: '@fabster/skill-python',
  },
  {
    id: 'docker',
    name: 'Docker',
    description: 'Containerization, Dockerfile authoring, and compose configurations',
    category: 'Infrastructure',
    tags: ['containers', 'deployment', 'devops'],
    provider: '@fabster/skill-docker',
  },
  {
    id: 'terraform',
    name: 'Terraform',
    description: 'Infrastructure as code with Terraform providers and modules',
    category: 'Infrastructure',
    tags: ['iac', 'cloud', 'devops'],
    provider: '@fabster/skill-terraform',
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    description: 'Kubernetes manifests, Helm charts, and cluster configuration',
    category: 'Infrastructure',
    tags: ['k8s', 'orchestration', 'devops'],
    provider: '@fabster/skill-kubernetes',
  },
];

const CATEGORIES = [...new Set(SKILLS.map((s) => s.category))];
const ALL_TAGS = [...new Set(SKILLS.flatMap((s) => s.tags))].sort();

export function SkillsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const filtered = SKILLS.filter((skill) => {
    if (search && !skill.name.toLowerCase().includes(search.toLowerCase()) && !skill.description.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedCategories.length > 0 && !selectedCategories.includes(skill.category)) {
      return false;
    }
    if (selectedTags.length > 0 && !selectedTags.some((t) => skill.tags.includes(t))) {
      return false;
    }
    return true;
  });

  const hasFilters = selectedCategories.length > 0 || selectedTags.length > 0 || search.length > 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Filter sidebar */}
      <div className="w-56 shrink-0 border-r p-4 flex flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
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
            Tags
          </Label>
          {ALL_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedTags.includes(tag)}
                onCheckedChange={() => toggleTag(tag)}
              />
              {tag}
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
                setSelectedTags([]);
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
            {filtered.length} skill{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
          {filtered.map((skill) => (
            <Card key={skill.id} className="flex flex-col">
              <CardHeader className="flex-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{skill.name}</CardTitle>
                </div>
                <CardDescription className="mt-2 line-clamp-3">
                  {skill.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{skill.category}</Badge>
                    {skill.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {skill.provider}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No skills found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
