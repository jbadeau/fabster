import type { SupportEvent } from './types.js';

/**
 * Map an inbound chat message to a support event. Choice keywords are
 * support-case vocabulary; anything else is a requester message folded
 * into context.
 */
export function toSupportEvent(text: string): SupportEvent {
  const normalized = text.trim().toLowerCase();
  if (normalized === 'close' || normalized === 'close discussion') {
    return { type: 'requester-choice', choice: 'close' };
  }
  if (normalized === 'still need help' || normalized === 'still-need-help') {
    return { type: 'requester-choice', choice: 'still-need-help' };
  }
  if (normalized === 'try-fix' || normalized === 'yes, try it' || normalized === 'try it') {
    return { type: 'requester-choice', choice: 'try-fix' };
  }
  if (normalized === 'do-it-myself' || normalized === 'i will do it myself') {
    return { type: 'requester-choice', choice: 'do-it-myself' };
  }
  if (normalized === 'does-not-apply' || normalized === 'does not apply') {
    return { type: 'requester-choice', choice: 'does-not-apply' };
  }
  return { type: 'requester-message', text };
}
