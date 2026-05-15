import type {
  AttributeValue,
  Capability,
  Requirement,
} from '../types/capability.js';

export function require_(
  namespace: string,
  filter: Record<string, AttributeValue>,
  options?: { optional?: boolean },
): Requirement {
  return Object.freeze({
    namespace,
    filter,
    ...(options?.optional != null ? { optional: options.optional } : {}),
  });
}

export function provide(
  namespace: string,
  attributes: Record<string, AttributeValue>,
): Capability {
  return Object.freeze({ namespace, attributes });
}
