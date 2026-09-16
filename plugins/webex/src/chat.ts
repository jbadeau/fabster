/**
 * Generic chat abstraction with a Webex implementation. Carries no domain
 * vocabulary — consumers map inbound messages to their own event types.
 */
export interface InboundChatMessage {
  readonly roomId: string;
  readonly personEmail?: string;
  readonly text: string;
}

export interface Chat {
  /** Post a markdown message to a room. */
  post(roomId: string, markdown: string): Promise<void>;
}

const WEBEX_API = 'https://webexapis.com/v1';

export function webexChat(token: string): Chat {
  return {
    async post(roomId, markdown) {
      const response = await fetch(`${WEBEX_API}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId, markdown }),
      });
      if (!response.ok) {
        throw new Error(`Webex post failed: ${response.status} ${await response.text()}`);
      }
    },
  };
}

/**
 * Fetch and normalize the message referenced by a Webex webhook delivery.
 * Webex webhooks carry only the message id; the text requires a read-back.
 */
export async function fetchWebexMessage(
  token: string,
  messageId: string,
): Promise<InboundChatMessage> {
  const response = await fetch(`${WEBEX_API}/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Webex message fetch failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as {
    roomId: string;
    personEmail?: string;
    text?: string;
    markdown?: string;
  };
  return {
    roomId: body.roomId,
    personEmail: body.personEmail,
    text: body.text ?? body.markdown ?? '',
  };
}
