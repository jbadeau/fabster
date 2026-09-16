import { useParams } from 'react-router';
import { ShieldCheck } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import {
  DetailShell,
  Section,
  DetailMessage,
  matchesSlug,
} from '@/components/catalog-detail';

const CATEGORY_BLURB: Record<string, string> = {
  consistency: 'Enforces uniform structure and naming across the workspace.',
  maintainability: 'Keeps the codebase easy to evolve and reason about.',
  reliability: 'Guards against changes that could break the system.',
  security: 'Protects against insecure or risky configuration.',
};

export function RuleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = trpc.listRules.useQuery();
  const rule = data?.rules.find((r) => matchesSlug(r, slug));

  if (!rule) {
    return (
      <DetailMessage
        icon={ShieldCheck}
        title={isLoading ? 'Loading…' : 'Rule not found'}
        backTo="/catalog/rules"
        backLabel="Back to rules"
      />
    );
  }

  return (
    <DetailShell
      backTo="/catalog/rules"
      backLabel="Rules"
      icon={ShieldCheck}
      eyebrow="Conformance rule"
      title={rule.name}
      description={rule.description}
      badges={
        <>
          <Badge variant="outline" className="capitalize">
            {rule.category}
          </Badge>
          <Badge variant={rule.severity === 'blocking' ? 'destructive' : 'secondary'}>
            {rule.severity}
          </Badge>
          <Badge variant="outline">{rule.provider}</Badge>
        </>
      }
    >
      <Section title="Category">
        <p className="text-sm text-muted-foreground">
          {CATEGORY_BLURB[rule.category] ?? rule.category}
        </p>
      </Section>

      <Section title="Severity">
        <p className="text-sm text-muted-foreground">
          {rule.severity === 'blocking'
            ? 'Violations block the pipeline — they must be fixed.'
            : 'Violations are advisory — reported but non-blocking.'}
        </p>
      </Section>
    </DetailShell>
  );
}
