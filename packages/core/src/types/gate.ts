export type BuiltinGateKind =
  | 'successfulBuild'
  | 'formatted'
  | 'linted'
  | 'testsPass';

export interface Gate {
  readonly kind: BuiltinGateKind | (string & {});
  readonly description?: string;
  readonly required?: boolean;
  /**
   * Shell script for custom gates; exit 0 = pass. Runs in the node's
   * worktree with {input} placeholders interpolated. Built-in kinds
   * ignore this field.
   */
  readonly check?: string;
}
