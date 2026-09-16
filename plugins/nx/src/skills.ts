import { skill, placeholderSkillContent } from '@fabster/core';
import type { SkillDefinition } from '@fabster/core';

interface SkillSpec {
  name: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
}

function defineSkill(spec: SkillSpec): SkillDefinition {
  return skill({
    ...spec,
    content: placeholderSkillContent(spec.title, spec.description, spec.tags),
  });
}

export const codeGenerationSkill = defineSkill({
  name: 'code-generation',
  title: 'Code Generation',
  description:
    'Generate production-ready TypeScript across apps and libraries, wiring up state, routing, and API integration.',
  category: 'Frontend',
  tags: ['typescript', 'codegen', 'scaffolding'],
});

export const testingSkill = defineSkill({
  name: 'testing',
  title: 'Testing',
  description:
    'Author unit, integration, and end-to-end tests (Vitest, Testing Library, Playwright) covering critical paths.',
  category: 'Testing',
  tags: ['vitest', 'playwright', 'quality'],
});

export const reactSkill = defineSkill({
  name: 'react',
  title: 'React',
  description:
    'React component development, hooks, and state management patterns for modern web applications.',
  category: 'Frontend',
  tags: ['ui', 'components', 'hooks'],
});

export const refactoringSkill = defineSkill({
  name: 'refactoring',
  title: 'Refactoring',
  description:
    'Restructure and clean up existing code safely while preserving behavior and improving maintainability.',
  category: 'Quality',
  tags: ['cleanup', 'maintainability'],
});
