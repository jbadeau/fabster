import { useParams } from 'react-router';
import { Terminal } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import {
  DetailShell,
  Section,
  BadgeList,
  IOTable,
  PermissionsBlock,
  DetailMessage,
  matchesSlug,
} from '@/components/catalog-detail';

export function CommandDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = trpc.listCommands.useQuery();
  const command = data?.commands.find((c) => matchesSlug(c, slug));

  if (!command) {
    return (
      <DetailMessage
        icon={Terminal}
        title={isLoading ? 'Loading…' : 'Command not found'}
        backTo="/catalog/commands"
        backLabel="Back to commands"
      />
    );
  }

  return (
    <DetailShell
      backTo="/catalog/commands"
      backLabel="Commands"
      icon={Terminal}
      eyebrow="Command"
      title={command.name}
      description={command.description}
      badges={
        <>
          <Badge variant="outline">{command.category}</Badge>
          <Badge variant="outline">{command.provider}</Badge>
        </>
      }
    >
      {command.steps && command.steps.length > 0 && (
        <Section title="Steps">
          <div className="flex flex-col gap-2">
            {command.steps.map((step, idx) => (
              <code
                key={idx}
                className="block rounded bg-muted px-2 py-1.5 font-mono text-xs"
              >
                {step}
              </code>
            ))}
          </div>
        </Section>
      )}

      {command.inputs && command.inputs.length > 0 && (
        <Section title="Inputs">
          <IOTable items={command.inputs} />
        </Section>
      )}

      {command.outputs && command.outputs.length > 0 && (
        <Section title="Outputs">
          <IOTable items={command.outputs} />
        </Section>
      )}

      {command.gates && command.gates.length > 0 && (
        <Section title="Gates">
          <BadgeList items={command.gates} />
        </Section>
      )}

      {command.permissions && (
        <Section title="Permissions">
          <PermissionsBlock permissions={command.permissions} />
        </Section>
      )}
    </DetailShell>
  );
}
