/**
 * An effect does a node's work inside the worktree. Effects are untrusted:
 * the result carries logs and an advisory self-report only — post-gates
 * decide node success. The one exception is a command effect, whose exit
 * code is itself a deterministic check and is reflected in `executed`.
 *
 * Effects never publish: commits, pushes, and merge requests are
 * engine-owned side effects, and effect processes hold no forge credentials.
 */
export interface EffectContext {
  readonly cwd: string;
  readonly onLog?: (message: string) => void;
  readonly retryEvidence?: string;
}

export interface EffectResult {
  /**
   * Whether the effect ran to completion. For commands this includes the
   * exit-code check (deterministic). For agent effects this is true whenever
   * the process ran at all — its exit status is advisory.
   */
  readonly executed: boolean;
  readonly logs: readonly string[];
  /** Self-reported status, logged but never used to decide node success. */
  readonly advisory?: string;
}

export interface Effect {
  readonly name: string;
  execute(ctx: EffectContext): Promise<EffectResult>;
}
