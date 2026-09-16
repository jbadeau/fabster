export interface SkillDefinition {
  readonly kind: 'skill';
  /** Capability name agents provide/require, e.g. "openapi". */
  readonly name: string;
  /** Human-friendly display name, e.g. "OpenAPI". Defaults to name. */
  readonly title?: string;
  readonly description: string;
  readonly category: string;
  readonly tags: readonly string[];
  /** Markdown guide (the SKILL.md contents), if any. */
  readonly content?: string;
}
