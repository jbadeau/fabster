import { useParams } from 'react-router';
import { ClipboardList } from 'lucide-react';
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

export function TaskDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = trpc.listTasks.useQuery();
  const task = data?.tasks.find((t) => matchesSlug(t, slug));

  if (!task) {
    return (
      <DetailMessage
        icon={ClipboardList}
        title={isLoading ? 'Loading…' : 'Task not found'}
        backTo="/catalog/tasks"
        backLabel="Back to tasks"
      />
    );
  }

  return (
    <DetailShell
      backTo="/catalog/tasks"
      backLabel="Tasks"
      icon={ClipboardList}
      eyebrow="Task"
      title={task.name}
      description={task.purpose}
      badges={
        <>
          <Badge variant="outline">{task.category}</Badge>
          <Badge variant="secondary">{task.reasoning} reasoning</Badge>
          <Badge variant="outline">{task.provider}</Badge>
        </>
      }
    >
      {task.requirements.length > 0 && (
        <Section title="Requirements">
          <div className="flex flex-col gap-1 text-sm">
            {task.requirements.map((req, i) => (
              <div key={i}>
                <code className="font-mono">{req.namespace}</code>
                {Object.entries(req.filter).map(([k, v]) => (
                  <span key={k} className="text-muted-foreground">
                    {' '}
                    {k}=<code className="font-mono">{JSON.stringify(v)}</code>
                  </span>
                ))}
                {req.optional ? (
                  <span className="text-muted-foreground"> (optional)</span>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      )}

      {task.inputs && task.inputs.length > 0 && (
        <Section title="Inputs">
          <IOTable items={task.inputs} />
        </Section>
      )}

      {task.outputs && task.outputs.length > 0 && (
        <Section title="Outputs">
          <IOTable items={task.outputs} />
        </Section>
      )}

      {task.instructions && task.instructions.length > 0 && (
        <Section title="Instructions">
          <ul className="list-disc pl-5 text-sm">
            {task.instructions.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        </Section>
      )}

      {task.rules && task.rules.length > 0 && (
        <Section title="Rules">
          <ul className="list-disc pl-5 text-sm">
            {task.rules.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </Section>
      )}

      {task.gates.length > 0 && (
        <Section title="Gates">
          <BadgeList items={task.gates} />
        </Section>
      )}

      {task.permissions && (
        <Section title="Permissions">
          <PermissionsBlock permissions={task.permissions} />
        </Section>
      )}
    </DetailShell>
  );
}
