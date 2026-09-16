/**
 * Conformance rules mirror the `@nx/conformance` `createConformanceRule` API so
 * fabster rules are drop-in compatible with Nx Conformance (and, later, can be
 * adapted to Backstage Soundcheck checks).
 *
 * @see https://nx.dev/docs/reference/conformance/create-conformance-rule
 */

export type RuleCategory =
  | 'consistency'
  | 'maintainability'
  | 'reliability'
  | 'security';

/**
 * Whether a violation blocks the pipeline. There is only one kind of rule —
 * severity is the single knob that says "stop the world" vs "just warn".
 */
export type RuleSeverity = 'blocking' | 'non-blocking';

/** A single rule violation. Matches Nx's ConformanceViolation. */
export interface ConformanceViolation {
  readonly message: string;
  readonly file?: string;
  readonly sourceProject?: string;
  readonly workspaceViolation?: boolean;
}

/** What a rule's implementation returns: the violations it found. */
export interface ConformanceResult {
  readonly violations: ConformanceViolation[];
}

/** Read-only view of workspace files (subset of Nx's ReadOnlyConformanceTree). */
export interface ConformanceTree {
  read(filePath: string): string | null;
  exists(filePath: string): boolean;
  children(dirPath: string): string[];
}

/** A project node (subset of Nx's ProjectGraphProjectNode). */
export interface ConformanceProject {
  readonly name: string;
  readonly type?: 'app' | 'lib' | 'e2e' | (string & {});
  readonly data: {
    readonly root: string;
    readonly tags?: readonly string[];
    readonly [key: string]: unknown;
  };
}

export interface ConformanceDependency {
  readonly source: string;
  readonly target: string;
  readonly type: string;
}

/** A project graph (subset of Nx's ProjectGraph). */
export interface ConformanceProjectGraph {
  readonly nodes: Record<string, ConformanceProject>;
  readonly dependencies: Record<string, readonly ConformanceDependency[]>;
}

/** Context passed to a rule's implementation. Matches Nx's rule context. */
export interface ConformanceContext {
  readonly tree: ConformanceTree;
  readonly projectGraph: ConformanceProjectGraph;
  readonly ruleOptions: Record<string, unknown>;
}

export type RuleImplementation = (
  context: ConformanceContext,
) => Promise<ConformanceResult>;

export interface RuleDefinition {
  readonly kind: 'rule';
  readonly name: string;
  readonly category: RuleCategory;
  readonly description: string;
  /** blocking = a violation fails the pipeline; non-blocking = advisory. */
  readonly severity: RuleSeverity;
  readonly implementation: RuleImplementation;
}
