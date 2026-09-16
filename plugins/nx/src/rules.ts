import { rule } from '@fabster/core';
import type { ConformanceViolation } from '@fabster/core';

/**
 * These rules cover workspace/organizational conformance — project metadata,
 * required files, and naming policy — NOT code-level checks that linters and
 * type-checkers already handle (no circular-import / module-boundary / dead-code
 * rules here; those belong to static analysis).
 */

/** Maintainability: every project declares tags for ownership/classification. */
export const projectsHaveTagsRule = rule({
  name: 'projects-have-tags',
  category: 'maintainability',
  description:
    'Every project must declare at least one tag so ownership and boundaries can be governed.',
  severity: 'blocking',
  implementation: async ({ projectGraph }) => {
    const violations: ConformanceViolation[] = [];
    for (const [name, project] of Object.entries(projectGraph.nodes)) {
      if ((project.data.tags ?? []).length === 0) {
        violations.push({
          message: `Project "${name}" has no tags.`,
          sourceProject: name,
        });
      }
    }
    return { violations };
  },
});

/** Maintainability: every project ships a README at its root. */
export const projectsHaveReadmeRule = rule({
  name: 'projects-have-readme',
  category: 'maintainability',
  description: 'Every project must include a README.md at its root.',
  severity: 'non-blocking',
  implementation: async ({ tree, projectGraph }) => {
    const violations: ConformanceViolation[] = [];
    for (const [name, project] of Object.entries(projectGraph.nodes)) {
      const root = project.data.root;
      const readme = !root || root === '.' ? 'README.md' : `${root}/README.md`;
      if (!tree.exists(readme)) {
        violations.push({
          message: `Project "${name}" is missing ${readme}.`,
          file: readme,
          sourceProject: name,
        });
      }
    }
    return { violations };
  },
});

/**
 * Reliability: a human must approve the change. This is the canonical rule that
 * static analysis can never satisfy — it requires a person. The pipeline passes
 * the approval state in as ruleOptions (e.g. { approved: true, approvedBy }).
 */
export const humanApprovalRule = rule({
  name: 'human-approval',
  category: 'reliability',
  description:
    'Changes must be explicitly approved by a human reviewer. This is a manual governance gate — it cannot be satisfied by automation.',
  severity: 'blocking',
  implementation: async ({ ruleOptions }) => {
    const approved = ruleOptions['approved'] === true;
    const approvedBy =
      typeof ruleOptions['approvedBy'] === 'string'
        ? (ruleOptions['approvedBy'] as string)
        : undefined;
    if (approved || approvedBy) return { violations: [] };
    return {
      violations: [
        { message: 'Awaiting human approval.', workspaceViolation: true },
      ],
    };
  },
});

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Consistency: project names follow the kebab-case naming policy. */
export const projectNamesAreKebabCaseRule = rule({
  name: 'project-names-kebab-case',
  category: 'consistency',
  description: 'Project names must be kebab-case (lowercase words separated by hyphens).',
  severity: 'non-blocking',
  implementation: async ({ projectGraph }) => {
    const violations: ConformanceViolation[] = [];
    for (const name of Object.keys(projectGraph.nodes)) {
      const base = name.includes('/') ? name.slice(name.lastIndexOf('/') + 1) : name;
      if (!KEBAB_CASE.test(base)) {
        violations.push({
          message: `Project name "${name}" is not kebab-case.`,
          sourceProject: name,
        });
      }
    }
    return { violations };
  },
});

/** Security: the workspace root package.json declares a license. */
export const rootPackageHasLicenseRule = rule({
  name: 'root-package-has-license',
  category: 'security',
  description: 'The workspace root package.json must declare a "license" field.',
  severity: 'non-blocking',
  implementation: async ({ tree }) => {
    const violations: ConformanceViolation[] = [];
    const raw = tree.read('package.json');
    let license: unknown;
    if (raw) {
      try {
        license = (JSON.parse(raw) as { license?: unknown }).license;
      } catch {
        // fall through — treated as missing
      }
    }
    if (!license) {
      violations.push({
        message: 'Root package.json is missing a "license" field.',
        file: 'package.json',
        workspaceViolation: true,
      });
    }
    return { violations };
  },
});
