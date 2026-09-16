import type { BuiltinGateKind, Gate } from '../types/gate.js';

const BUILTIN_KINDS: ReadonlySet<string> = new Set([
  'successfulBuild',
  'formatted',
  'linted',
  'testsPass',
]);

export function gate(
  kind: BuiltinGateKind | (string & {}),
  options?: { description?: string; required?: boolean; check?: string },
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
