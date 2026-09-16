import { useParams } from 'react-router';
import { Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import {
  DetailShell,
  Section,
  DetailMessage,
  matchesSlug,
} from '@/components/catalog-detail';
import { MarkdownView } from '@/components/markdown-view';

export function SkillDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = trpc.listSkills.useQuery();
  const skill = data?.skills.find((s) => matchesSlug(s, slug));

  if (!skill) {
    return (
      <DetailMessage
        icon={Sparkles}
        title={isLoading ? 'Loading…' : 'Skill not found'}
        backTo="/catalog/skills"
        backLabel="Back to skills"
      />
    );
  }

  return (
    <DetailShell
      backTo="/catalog/skills"
      backLabel="Skills"
      icon={Sparkles}
      eyebrow="Skill"
      title={skill.name}
      description={skill.description}
      badges={
        <>
          <Badge variant="outline">{skill.category}</Badge>
          {skill.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          <Badge variant="outline">{skill.provider}</Badge>
        </>
      }
    >
      {skill.content ? (
        <Section title="Guide">
          <div className="overflow-x-auto rounded-md border bg-background">
            <MarkdownView markdown={skill.content} />
          </div>
        </Section>
      ) : (
        <p className="text-sm text-muted-foreground">
          This skill has no detailed guide.
        </p>
      )}
    </DetailShell>
  );
}
