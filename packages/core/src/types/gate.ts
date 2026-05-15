export type BuiltinGateKind =
  | 'successfulBuild'
  | 'formatted'
  | 'linted'
  | 'conformant'
  | 'humanApproved'
  | 'testsPass';

export interface Gate {
  readonly kind: BuiltinGateKind | (string & {});
  readonly description?: string;
  readonly required?: boolean;
}
