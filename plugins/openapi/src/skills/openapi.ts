import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { skill } from '@fabster/core';

const here = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(join(here, 'openapi', 'SKILL.md'), 'utf-8');

export const openapiSkill = skill({
  name: 'openapi',
  title: 'OpenAPI',
  description:
    'Comprehensive patterns for creating, maintaining, and validating OpenAPI 3.1 specifications and API clients.',
  category: 'API',
  tags: ['api', 'codegen', 'rest'],
  content,
});
