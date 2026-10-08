import { PrismaService } from '../../prisma/prisma.service';
import type { ConversationListFilter, ConversationPatch, WhatsAppCannedResponseRecord, WhatsAppConversationSummary, WhatsAppMessageRecord, WhatsAppStatus } from '../domain/whatsapp-message';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';
export declare class PrismaWhatsAppMessageRepository extends WhatsAppMessageRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: Omit<WhatsAppMessageRecord, 'id' | 'createdAt' | 'updatedAt' | 'sentByName'> & {
        conversationId?: string | null;
    }): Promise<WhatsAppMessageRecord>;
    findByWhatsappMessageId(whatsappMessageId: string): Promise<WhatsAppMessageRecord | null>;
    findConversation(phone: string): Promise<WhatsAppMessageRecord[]>;
    listConversations(filter: ConversationListFilter): Promise<WhatsAppConversationSummary[]>;
    getConversation(phone: string): Promise<WhatsAppConversationSummary | null>;
    upsertConversation(input: {
        phone: string;
        name?: string | null;
        preview: string;
        inbound: boolean;
        reopen?: boolean;
    }): Promise<WhatsAppConversationSummary>;
    updateConversation(phone: string, patch: ConversationPatch): Promise<WhatsAppConversationSummary>;
    markConversationRead(phone: string): Promise<void>;
    updateStatusByWhatsappMessageId(whatsappMessageId: string, status: WhatsAppStatus): Promise<void>;
    listCannedResponses(): Promise<WhatsAppCannedResponseRecord[]>;
    createCannedResponse(input: {
        shortCode: string;
        title: string;
        content: string;
    }): Promise<WhatsAppCannedResponseRecord>;
    deleteCannedResponse(id: string): Promise<void>;
    private backfillConversations;
    private toMessage;
    private toConversation;
}
