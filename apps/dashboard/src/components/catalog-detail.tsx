import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Stable slug for a catalog item. Prefers the server-provided `slug`, but
 * falls back to the id suffix (`plugin:name` → `name`) so links work even
 * against an older daemon that predates the `slug` field.
 */
export function itemSlug(item: { slug?: string; id: string }): string {
  return item.slug ?? item.id.split(':').slice(1).join(':');
}

/** Match a catalog item against a route param, tolerant of slug/name/id forms. */
export function matchesSlug(
  item: { slug?: string; id: string; name: string },
  param: string | undefined,
): boolean {
  if (!param) return false;
  return itemSlug(item) === param || item.name === param;
}

export interface IODescriptor {
  name: string;
  kind: string;
  description?: string;
  required?: boolean;
  array?: boolean;
}

export interface PermissionsView {
  fs?: { read?: string[]; write?: string[] };
  tools?: string[];
  network?: string[];
  apis?: { name: string; baseUrl?: string; scopes?: string[] }[];
  externalSystems?: { name: string; kind?: string; host?: string }[];
  secrets?: string[];
}

/** Page shell: back link, icon + title header, optional badges, then content. */
export function DetailShell({
  backTo,
  backLabel,
  icon: Icon,
  eyebrow,
  title,
  description,
  badges,
  children,
}: {
  backTo: string;
  backLabel: string;
  icon: ComponentType<{ className?: string }>;
  eyebrow?: string;
  title: string;
  description?: string;
  badges?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b p-4 lg:p-6">
        <Link
          to={backTo}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="flex items-start gap-3">
          <Icon className="mt-1 h-6 w-6 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            {eyebrow ? (
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {eyebrow}
              </span>
            ) : null}
            <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {badges ? <div className="mt-3 flex flex-wrap gap-1.5">{badges}</div> : null}
      </div>
      <div className="flex max-w-4xl flex-col gap-6 p-4 lg:p-6">{children}</div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function BadgeList({
  items,
  variant = 'secondary',
}: {
  items: string[];
  variant?: 'default' | 'secondary' | 'outline';
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant={variant}>
          {item}
        </Badge>
      ))}
    </div>
  );
}

export function IOTable({ items }: { items: IODescriptor[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((io) => (
        <div key={io.name} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-sm">
            <code className="font-mono">{io.name}</code>
            <Badge variant="outline" className="text-xs">
              {io.kind}
              {io.array ? '[]' : ''}
            </Badge>
            {io.required ? (
              <span className="text-xs text-muted-foreground">required</span>
            ) : null}
          </div>
          {io.description ? (
            <p className="text-xs text-muted-foreground">{io.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function PermissionsBlock({ permissions }: { permissions: PermissionsView }) {
  const rows: Array<[string, string[]]> = [];
  if (permissions.fs?.read?.length) rows.push(['fs read', permissions.fs.read]);
  if (permissions.fs?.write?.length) rows.push(['fs write', permissions.fs.write]);
  if (permissions.tools?.length) rows.push(['tools', permissions.tools]);
  if (permissions.network?.length) rows.push(['network', permissions.network]);

  const apis = permissions.apis ?? [];
  const externalSystems = permissions.externalSystems ?? [];
  const secrets = permissions.secrets ?? [];

  const hasAny =
    rows.length > 0 ||
    apis.length > 0 ||
    externalSystems.length > 0 ||
    secrets.length > 0;
  if (!hasAny) return null;

  return (
    <div className="flex flex-col gap-3 text-sm">
      {rows.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {rows.map(([label, values]) => (
            <div key={label} className="flex gap-2">
              <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
              <span className="font-mono text-xs">{values.join(', ')}</span>
            </div>
          ))}
        </div>
      )}

      {apis.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            APIs
          </span>
          {apis.map((api) => (
            <div key={api.name} className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{api.name}</span>
              {api.baseUrl ? (
                <code className="font-mono text-xs text-muted-foreground">
                  {api.baseUrl}
                </code>
              ) : null}
              {api.scopes?.map((s) => (
                <Badge key={s} variant="outline" className="text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          ))}
        </div>
      )}

      {externalSystems.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            External Systems
          </span>
          {externalSystems.map((sys) => (
            <div key={sys.name} className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{sys.name}</span>
              {sys.kind ? (
                <Badge variant="secondary" className="text-[10px]">
                  {sys.kind}
                </Badge>
              ) : null}
              {sys.host ? (
                <code className="font-mono text-xs text-muted-foreground">
                  {sys.host}
                </code>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {secrets.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Lock className="h-3 w-3" /> Secrets
          </div>
          <div className="flex flex-wrap gap-1.5">
            {secrets.map((s) => (
              <Badge key={s} variant="outline" className="font-mono text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Names only. Values are injected from the OS keystore into the sandbox
            at run time — never exposed to agents, prompts, logs, or this
            dashboard.
          </p>
        </div>
      )}
    </div>
  );
}

/** Centered "not found / loading" state for a detail route. */
export function DetailMessage({
  icon: Icon,
  title,
  backTo,
  backLabel,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  backTo: string;
  backLabel: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/50" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <Link to={backTo} className="text-sm text-muted-foreground hover:text-foreground">
        ← {backLabel}
      </Link>
    </div>
  );
}
