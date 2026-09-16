import type {
  RuleDefinition,
  RuleCategory,
  RuleSeverity,
  RuleImplementation,
  ConformanceContext,
} from '../types/rule.js';

interface RuleConfig {
  readonly name: string;
  readonly category: RuleCategory;
  readonly description: string;
  /** blocking = a violation fails the pipeline; non-blocking = advisory. */
  readonly severity: RuleSeverity;
  readonly implementation: RuleImplementation;
}

/**
 * Define a conformance rule. There is only one kind of rule; `severity`
 * decides whether a violation is blocking or advisory.
 *
 * @see https://nx.dev/docs/reference/conformance/create-conformance-rule
 */
export function rule(config: RuleConfig): RuleDefinition {
  return Object.freeze({
    kind: 'rule' as const,
    ...config,
  });
}

interface NxConformanceRuleOptions {
  name: string;
  category: RuleCategory;
  description: string;
  implementation: (context: ConformanceContext) => Promise<{
    severity: 'low' | 'medium' | 'high';
    details: { violations: import('../types/rule.js').ConformanceViolation[] };
  }>;
}

/**
 * Adapt a fabster rule to `@nx/conformance`'s `createConformanceRule` options.
 * fabster's blocking/non-blocking severity maps to Nx's high/low:
 *
 *   export default createConformanceRule(toConformanceRuleOptions(myRule));
 */
export function toConformanceRuleOptions(
  definition: RuleDefinition,
): NxConformanceRuleOptions {
  return {
    name: definition.name,
    category: definition.category,
    description: definition.description,
    implementation: async (context) => {
      const { violations } = await definition.implementation(context);
      return {
        severity: definition.severity === 'blocking' ? 'high' : 'low',
        details: { violations },
      };
    },
  };
}
