import { rule } from '@fabster/core';
import type { ConformanceViolation } from '@fabster/core';

/** Consistency: projects tagged as OpenAPI must ship a spec file. */
export const openApiProjectsHaveSpecRule = rule({
  name: 'openapi-projects-have-spec',
  category: 'consistency',
  description:
    'Projects tagged "openapi" (or named *api-spec) must contain an OpenAPI spec file at their root.',
  severity: 'blocking',
  implementation: async ({ tree, projectGraph }) => {
    const violations: ConformanceViolation[] = [];
    for (const [name, project] of Object.entries(projectGraph.nodes)) {
      const tags = project.data.tags ?? [];
      const isApi =
        tags.includes('openapi') ||
        tags.includes('type:openapi') ||
        name.includes('api-spec');
      if (!isApi) continue;

      const root = project.data.root;
      const files = tree.children(root);
      const hasSpec = files.some((f) => /openapi|\.ya?ml$/i.test(f));
      if (!hasSpec) {
        violations.push({
          message: `OpenAPI project "${name}" has no spec file in "${root}".`,
          sourceProject: name,
        });
      }
    }
    return { violations };
  },
});
