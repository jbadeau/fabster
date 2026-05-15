import type { BuiltinGateKind, Gate } from '../types/gate.js';

export function gate(
  kind: BuiltinGateKind | (string & {}),
  options?: { description?: string; required?: boolean },
): Gate {
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

export function conformant(): Gate {
  return gate('conformant');
}

export function humanApproved(): Gate {
  return gate('humanApproved');
}

export function testsPass(): Gate {
  return gate('testsPass');
}
