import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ShieldCheck, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { itemSlug } from '@/components/catalog-detail';
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

// Mirrors the Nx Conformance rule model — see @fabster/core's rule().
interface Rule {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  severity: 'blocking' | 'non-blocking';
  provider: string;
}

const SEVERITIES = ['blocking', 'non-blocking'] as const;

export function RulesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = trpc.listRules.useQuery();
  const rules = useMemo<Rule[]>(() => data?.rules ?? [], [data]);

  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  const CATEGORIES = useMemo(
    () => [...new Set(rules.map((r) => r.category))].sort(),
    [rules],
  );
  const PROVIDERS = useMemo(
    () => [...new Set(rules.map((r) => r.provider))].sort(),
    [rules],
  );

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const toggleSeverity = (sev: string) => {
    setSelectedSeverities((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev],
    );
  };

  const toggleProvider = (provider: string) => {
    setSelectedProviders((prev) =>
      prev.includes(provider)
        ? prev.filter((p) => p !== provider)
        : [...prev, provider],
    );
  };

  const filtered = rules.filter((rule) => {
    if (
      search &&
      !rule.name.toLowerCase().includes(search.toLowerCase()) &&
      !rule.description.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (selectedCategories.length > 0 && !selectedCategories.includes(rule.category)) {
      return false;
    }
    if (selectedSeverities.length > 0 && !selectedSeverities.includes(rule.severity)) {
      return false;
    }
    if (selectedProviders.length > 0 && !selectedProviders.includes(rule.provider)) {
      return false;
    }
    return true;
  });

  const hasFilters =
    selectedCategories.length > 0 ||
    selectedSeverities.length > 0 ||
    selectedProviders.length > 0 ||
    search.length > 0;

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
            <label key={cat} className="flex items-center gap-2 text-sm capitalize">
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

        <Separator />

        <div className="flex flex-col gap-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Provider
          </Label>
          {PROVIDERS.map((provider) => (
            <label key={provider} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedProviders.includes(provider)}
                onCheckedChange={() => toggleProvider(provider)}
              />
              {provider}
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
                setSelectedSeverities([]);
                setSelectedProviders([]);
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
              ? 'Loading rules…'
              : `${filtered.length} conformance rule${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,260px))]">
          {filtered.map((rule) => (
            <Card
              key={rule.id}
              onClick={() => navigate(`/catalog/rules/${itemSlug(rule)}`)}
              className="flex flex-col cursor-pointer transition-colors hover:border-primary/50"
            >
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
                    <Badge variant="outline" className="capitalize">
                      {rule.category}
                    </Badge>
                    <Badge
                      variant={rule.severity === 'blocking' ? 'destructive' : 'secondary'}
                    >
                      {rule.severity}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{rule.provider}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No rules found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {rules.length === 0
                ? 'No plugins with rules are installed'
                : 'Try adjusting your filters'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
