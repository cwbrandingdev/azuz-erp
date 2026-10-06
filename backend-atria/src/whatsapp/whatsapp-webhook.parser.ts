import type { WhatsappMessageType } from './whatsapp.constants';

export interface WhatsappInboundMessage {
  phoneNumberId: string;
  waId: string;
  waMessageId: string;
  timestamp: string | null;
  type: WhatsappMessageType;
  body: string | null;
  contactName: string | null;
}

export interface WhatsappStatusUpdate {
  phoneNumberId: string;
  waMessageId: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  errorMessage: string | null;
}

interface InboundMessagePayload {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string; filename?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string } };
}

interface WebhookBody {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: InboundMessagePayload[];
        statuses?: Array<{
          id?: string;
          status?: string;
          errors?: Array<{ title?: string; message?: string }>;
        }>;
      };
    }>;
  }>;
}

function mapType(raw: string | undefined): WhatsappMessageType {
  switch (raw) {
    case 'text':
      return 'TEXT';
    case 'image':
      return 'IMAGE';
    case 'audio':
      return 'AUDIO';
    case 'video':
      return 'VIDEO';
    case 'document':
      return 'DOCUMENT';
    case 'sticker':
      return 'STICKER';
    case 'button':
    case 'interactive':
      return 'TEXT';
    default:
      return 'UNKNOWN';
  }
}

function mapStatus(raw: string | undefined): WhatsappStatusUpdate['status'] | null {
  switch (raw) {
    case 'sent':
      return 'SENT';
    case 'delivered':
      return 'DELIVERED';
    case 'read':
      return 'READ';
    case 'failed':
      return 'FAILED';
    default:
      return null;
  }
}

function extractBody(message: InboundMessagePayload): string | null {
  return (
    message.text?.body ||
    message.button?.text ||
    message.interactive?.button_reply?.title ||
    message.image?.caption ||
    message.video?.caption ||
    message.document?.caption ||
    message.document?.filename ||
    (message.type ? `[${message.type}]` : null)
  );
}

export function parseWhatsappWebhook(body: unknown): {
  messages: WhatsappInboundMessage[];
  statuses: WhatsappStatusUpdate[];
} {
  const payload = (body ?? {}) as WebhookBody;
  const messages: WhatsappInboundMessage[] = [];
  const statuses: WhatsappStatusUpdate[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id?.trim();
      if (!phoneNumberId) continue;

      const contactName = value?.contacts?.[0]?.profile?.name ?? null;

      for (const message of value?.messages ?? []) {
        if (!message.id || !message.from) continue;
        messages.push({
          phoneNumberId,
          waId: message.from.replace(/\D/g, ''),
          waMessageId: message.id,
          timestamp: message.timestamp ?? null,
          type: mapType(message.type),
          body: extractBody(message),
          contactName,
        });
      }

      for (const status of value?.statuses ?? []) {
        const mapped = mapStatus(status.status);
        if (!status.id || !mapped) continue;
        statuses.push({
          phoneNumberId,
          waMessageId: status.id,
          status: mapped,
          errorMessage: status.errors?.[0]?.title || status.errors?.[0]?.message || null,
        });
      }
    }
  }

  return { messages, statuses };
}
