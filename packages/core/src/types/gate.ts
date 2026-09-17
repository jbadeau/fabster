export type BuiltinGateKind =
  | 'successfulBuild'
  | 'formatted'
  | 'linted'
  | 'testsPass'
  | 'conformant';

/**
 * One HTTP call in a conformance sequence, run in order against the
 * started service. `capture` names the parsed JSON response so a later
 * request's `path` or `body` can reference it via `{name.field.path}`
 * (dot-path into the captured value) — the only way one step's result
 * reaches another, since requests carry no other shared state.
 */
export interface ConformanceRequest {
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly path: string;
  readonly body?: unknown;
  readonly expectStatus: number;
  readonly capture?: string;
  /** Dot-path assertions against the parsed JSON response body. */
  readonly expectBody?: Record<string, unknown>;
}

export interface ConformanceConfig {
  /** Shell command that starts the service. Killed once the sequence finishes or fails. */
  readonly start: string;
  readonly baseUrl: string;
  /** Polled (any response counts as ready) until it answers or timeoutMs elapses. */
  readonly readyPath?: string;
  readonly timeoutMs?: number;
  readonly requests: readonly ConformanceRequest[];
}

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
  /** Config for kind 'conformant' — ignored by every other kind. */
  readonly conformance?: ConformanceConfig;
}
