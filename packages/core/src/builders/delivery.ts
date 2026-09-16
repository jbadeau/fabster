import type { Delivery } from '../types/delivery.js';

export function mergeRequest(options?: { review?: boolean }): Delivery {
  return Object.freeze({
    kind: 'mergeRequest' as const,
    review: options?.review !== false,
  });
}
