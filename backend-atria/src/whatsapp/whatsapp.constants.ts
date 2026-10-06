export const WHATSAPP_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export type WhatsappDirection = (typeof WHATSAPP_DIRECTIONS)[number];

export const WHATSAPP_MESSAGE_TYPES = [
  'TEXT',
  'TEMPLATE',
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'DOCUMENT',
  'STICKER',
  'UNKNOWN',
] as const;
export type WhatsappMessageType = (typeof WHATSAPP_MESSAGE_TYPES)[number];

export const WHATSAPP_MESSAGE_STATUSES = [
  'PENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
] as const;
export type WhatsappMessageStatus = (typeof WHATSAPP_MESSAGE_STATUSES)[number];
