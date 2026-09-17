import type { BuiltinGateKind, ConformanceConfig, Gate } from '../types/gate.js';

const BUILTIN_KINDS: ReadonlySet<string> = new Set([
  'successfulBuild',
  'formatted',
  'linted',
  'testsPass',
  'conformant',
]);

export function gate(
  kind: BuiltinGateKind | (string & {}),
  options?: { description?: string; required?: boolean; check?: string; conformance?: ConformanceConfig },
): Gate {
  if (!BUILTIN_KINDS.has(kind) && !options?.check) {
    throw new Error(
      `Custom gate "${kind}" must declare a check script — a gate without a check cannot verify anything.`,
    );
  }
  return Object.freeze({ kind, ...options });
}

export function successfulBuild(): Gate {
  return gate('successfulBuild');
}

export function formatted(): Gate {
  return gate('formatted');
}

export function linted(): Gate {
  return gate('linted');
}

export function testsPass(): Gate {
  return gate('testsPass');
}

/**
 * Start the built service and replay a real HTTP request sequence against
 * it — the gate that "the build passed" and "the code lints" can't be:
 * they check that the code compiles, not that a POST-then-partial-PUT
 * actually behaves like a REST API is supposed to. Declarative on purpose
 * (structured data, not a script path) so the whole check lives in the
 * gate definition itself with nothing to resolve inside the worktree.
 */
export function conformant(config: ConformanceConfig): Gate {
  return gate('conformant', { conformance: config });
}
