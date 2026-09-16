import type { SkillDefinition } from '../types/skill.js';

interface SkillConfig {
  readonly name: string;
  readonly title?: string;
  readonly description: string;
  readonly category: string;
  readonly tags?: readonly string[];
  readonly content?: string;
}

export function skill(config: SkillConfig): SkillDefinition {
  return Object.freeze({
    kind: 'skill' as const,
    ...config,
    tags: config.tags ?? [],
  });
}

/**
 * Generate placeholder markdown for a skill that doesn't yet have a real
 * SKILL.md guide. Built with single-quoted strings (no template literals) so
 * fenced code blocks are safe.
 */
export function placeholderSkillContent(
  title: string,
  description: string,
  tags: readonly string[] = [],
): string {
  return [
    '# ' + title,
    '',
    description,
    '',
    '> **Placeholder guide** — replace with real documentation, examples, and best practices.',
    '',
    '## When to use this skill',
    '',
    'Reach for the ' + title + ' skill when a task needs ' + title.toLowerCase() + ' expertise.',
    '',
    '## Topics covered',
    '',
    ...(tags.length > 0 ? tags.map((t) => '- ' + t) : ['- (to be documented)']),
    '',
    '## Example',
    '',
    '```bash',
    '# TODO: add a real example for ' + title,
    'echo "placeholder"',
    '```',
    '',
    '## Notes',
    '',
    'This is auto-generated placeholder content for the ' + title + ' skill.',
  ].join('\n');
}
