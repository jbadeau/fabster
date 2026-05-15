import { describe, expect, it } from 'vitest';
import { createOpenApiSpec, openapiDeveloper } from '../index.js';

describe('@fabster/openapi catalog', () => {
  it('exports the create-openapi-spec task', () => {
    expect(createOpenApiSpec.kind).toBe('task');
    expect(createOpenApiSpec.name).toBe('create-openapi-spec');
  });

  it('exports the openapi-developer agent', () => {
    expect(openapiDeveloper.kind).toBe('agent');
    expect(openapiDeveloper.name).toBe('openapi-developer');
    expect(openapiDeveloper.tools.writeFile).toBeDefined();
  });
});
