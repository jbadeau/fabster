import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type {
  TaskDefinition,
  CommandDefinition,
  Requirement,
  Gate,
} from '@fabster/core';

// Framework packages under the @fabster scope that are NOT plugins.
const FRAMEWORK_PACKAGES = new Set(['core', 'runtime', 'server', 'cli', 'dashboard']);

// Nicer display names for known plugins; falls back to capitalized slug.
const CATEGORY_LABELS: Record<string, string> = {
  nx: 'Nx',
  openapi: 'OpenAPI',
  forge: 'Forge',
};

export interface CatalogTask {
  id: string;
  name: string;
  purpose: string;
  reasoning: 'low' | 'medium' | 'high';
  requirements: string[];
  category: string;
  gates: string[];
}

export interface CatalogCommand {
  id: string;
  name: string;
  description: string;
  run: string;
  category: string;
  tools: string[];
}

interface PluginModule {
  [exportName: string]: unknown;
}

function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

function requirementLabel(req: Requirement): string {
  const name = req.filter['name'];
  if (typeof name === 'string') return name;
  const values = Object.values(req.filter).filter(
    (v): v is string => typeof v === 'string',
  );
  return values[0] ?? req.namespace;
}

function gateLabels(gates: readonly Gate[] | undefined): string[] {
  return gates?.map((g) => g.kind) ?? [];
}

function isTask(value: unknown): value is TaskDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'task'
  );
}

function isCommand(value: unknown): value is CommandDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'command'
  );
}

// Discover installed @fabster plugin packages (everything in the scope that
// isn't a framework package).
async function discoverPluginSlugs(): Promise<string[]> {
  const scopeDir = path.join(process.cwd(), 'node_modules', '@fabster');
  try {
    const entries = await readdir(scopeDir);
    return entries.filter((name) => !FRAMEWORK_PACKAGES.has(name) && !name.startsWith('.'));
  } catch {
    return [];
  }
}

async function loadPlugin(slug: string): Promise<PluginModule | null> {
  try {
    // Bare specifier so the package's export conditions (e.g. @fabster/source)
    // resolve the same way they do for workflow files.
    return (await import(`@fabster/${slug}`)) as PluginModule;
  } catch {
    return null;
  }
}

export async function loadCatalog(): Promise<{
  tasks: CatalogTask[];
  commands: CatalogCommand[];
}> {
  const slugs = await discoverPluginSlugs();
  const tasks: CatalogTask[] = [];
  const commands: CatalogCommand[] = [];

  for (const slug of slugs) {
    const mod = await loadPlugin(slug);
    if (!mod) continue;
    const category = categoryLabel(slug);

    for (const value of Object.values(mod)) {
      if (isTask(value)) {
        tasks.push({
          id: `${slug}:${value.name}`,
          name: value.name,
          purpose: value.purpose,
          reasoning: value.reasoning ?? 'medium',
          requirements: value.requirements.map(requirementLabel),
          category,
          gates: gateLabels(value.gates),
        });
      } else if (isCommand(value)) {
        commands.push({
          id: `${slug}:${value.name}`,
          name: value.name,
          description: value.purpose,
          run: value.steps.map((s) => s.script).join(' && '),
          category,
          tools: value.permissions?.tools ? [...value.permissions.tools] : [],
        });
      }
    }
  }

  tasks.sort((a, b) => a.name.localeCompare(b.name));
  commands.sort((a, b) => a.name.localeCompare(b.name));

  return { tasks, commands };
}
