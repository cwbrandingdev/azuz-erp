import type { ConversationListFilter, ConversationPatch, WhatsAppCannedResponseRecord, WhatsAppConversationSummary, WhatsAppMessageRecord, WhatsAppStatus } from './whatsapp-message';
export declare abstract class WhatsAppMessageRepository {
    abstract create(data: Omit<WhatsAppMessageRecord, 'id' | 'createdAt' | 'updatedAt' | 'sentByName'> & {
        conversationId?: string | null;
    }): Promise<WhatsAppMessageRecord>;
    abstract findByWhatsappMessageId(whatsappMessageId: string): Promise<WhatsAppMessageRecord | null>;
    abstract findConversation(phone: string): Promise<WhatsAppMessageRecord[]>;
    abstract listConversations(filter: ConversationListFilter): Promise<WhatsAppConversationSummary[]>;
    abstract getConversation(phone: string): Promise<WhatsAppConversationSummary | null>;
    abstract upsertConversation(input: {
        phone: string;
        name?: string | null;
        preview: string;
        inbound: boolean;
        reopen?: boolean;
    }): Promise<WhatsAppConversationSummary>;
    abstract updateConversation(phone: string, patch: ConversationPatch): Promise<WhatsAppConversationSummary>;
    abstract markConversationRead(phone: string): Promise<void>;
    abstract updateStatusByWhatsappMessageId(whatsappMessageId: string, status: WhatsAppStatus): Promise<void>;
    abstract listCannedResponses(): Promise<WhatsAppCannedResponseRecord[]>;
    abstract createCannedResponse(input: {
        shortCode: string;
        title: string;
        content: string;
    }): Promise<WhatsAppCannedResponseRecord>;
    abstract deleteCannedResponse(id: string): Promise<void>;
}
