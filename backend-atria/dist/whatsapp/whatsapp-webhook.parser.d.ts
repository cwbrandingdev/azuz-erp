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
export declare function parseWhatsappWebhook(body: unknown): {
    messages: WhatsappInboundMessage[];
    statuses: WhatsappStatusUpdate[];
};
