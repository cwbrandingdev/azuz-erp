export declare const WHATSAPP_DIRECTIONS: readonly ["INBOUND", "OUTBOUND"];
export type WhatsappDirection = (typeof WHATSAPP_DIRECTIONS)[number];
export declare const WHATSAPP_MESSAGE_TYPES: readonly ["TEXT", "TEMPLATE", "IMAGE", "AUDIO", "VIDEO", "DOCUMENT", "STICKER", "UNKNOWN"];
export type WhatsappMessageType = (typeof WHATSAPP_MESSAGE_TYPES)[number];
export declare const WHATSAPP_MESSAGE_STATUSES: readonly ["PENDING", "SENT", "DELIVERED", "READ", "FAILED"];
export type WhatsappMessageStatus = (typeof WHATSAPP_MESSAGE_STATUSES)[number];
