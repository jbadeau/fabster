import { useState } from 'react';
import { ShieldCheck, Search } from 'lucide-react';
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

interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  phase: 'validation' | 'review';
  severity: 'required' | 'optional';
}

const RULES: Rule[] = [
  {
    id: 'successful-build',
    name: 'Successful Build',
    description: 'Project compiles without errors. Runs the build target via Nx affected.',
    category: 'Quality',
    phase: 'validation',
    severity: 'required',
  },
  {
    id: 'tests-pass',
    name: 'Tests Pass',
    description: 'All unit and integration tests pass. Runs the test target via Nx affected.',
    category: 'Quality',
    phase: 'validation',
    severity: 'required',
  },
  {
    id: 'linted',
    name: 'Linted',
    description: 'Code passes all lint rules. Runs the lint target via Nx affected.',
    category: 'Quality',
    phase: 'validation',
    severity: 'required',
  },
  {
    id: 'formatted',
    name: 'Formatted',
    description: 'Code follows formatting standards (Prettier, etc).',
    category: 'Quality',
    phase: 'validation',
    severity: 'optional',
  },
  {
    id: 'conformant',
    name: 'Conformant',
    description: 'Code adheres to workspace conformance rules and architectural constraints.',
    category: 'Architecture',
    phase: 'validation',
    severity: 'optional',
  },
  {
    id: 'human-approved',
    name: 'Human Approved',
    description: 'Merge request has been reviewed and approved by a human reviewer.',
    category: 'Review',
    phase: 'review',
    severity: 'required',
  },
  {
    id: 'no-secrets',
    name: 'No Secrets',
    description: 'No hardcoded secrets, API keys, or credentials in the codebase.',
    category: 'Security',
    phase: 'validation',
    severity: 'required',
  },
  {
    id: 'type-safe',
    name: 'Type Safe',
    description: 'No TypeScript type errors. Strict mode compilation passes.',
    category: 'Quality',
    phase: 'validation',
    severity: 'required',
  },
];

const CATEGORIES = [...new Set(RULES.map((r) => r.category))];
const PHASES = ['validation', 'review'] as const;
const SEVERITIES = ['required', 'optional'] as const;

export function RulesPage() {
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPhases, setSelectedPhases] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const togglePhase = (phase: string) => {
    setSelectedPhases((prev) =>
      prev.includes(phase) ? prev.filter((p) => p !== phase) : [...prev, phase],
    );
  };

  const toggleSeverity = (sev: string) => {
    setSelectedSeverities((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev],
    );
  };

  const filtered = RULES.filter((rule) => {
    if (search && !rule.name.toLowerCase().includes(search.toLowerCase()) && !rule.description.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedCategories.length > 0 && !selectedCategories.includes(rule.category)) {
      return false;
    }
    if (selectedPhases.length > 0 && !selectedPhases.includes(rule.phase)) {
      return false;
    }
    if (selectedSeverities.length > 0 && !selectedSeverities.includes(rule.severity)) {
      return false;
    }
    return true;
  });

  const hasFilters = selectedCategories.length > 0 || selectedPhases.length > 0 || selectedSeverities.length > 0 || search.length > 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Filter sidebar */}
      <div className="w-56 shrink-0 border-r p-4 flex flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
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
            Phase
          </Label>
          {PHASES.map((phase) => (
            <label key={phase} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedPhases.includes(phase)}
                onCheckedChange={() => togglePhase(phase)}
              />
              {phase}
            </label>
          ))}
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Severity
          </Label>
          {SEVERITIES.map((sev) => (
            <label key={sev} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedSeverities.includes(sev)}
                onCheckedChange={() => toggleSeverity(sev)}
              />
              {sev}
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
                setSelectedPhases([]);
                setSelectedSeverities([]);
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
            {filtered.length} rule{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,260px))]">
          {filtered.map((rule) => (
            <Card key={rule.id} className="flex flex-col">
              <CardHeader className="flex-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{rule.name}</CardTitle>
                </div>
                <CardDescription className="mt-2 line-clamp-3">
                  {rule.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{rule.category}</Badge>
                    <Badge variant="secondary">{rule.phase}</Badge>
                    <Badge variant={rule.severity === 'required' ? 'default' : 'secondary'}>
                      {rule.severity}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No rules found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
