import { PrismaService } from '../../prisma/prisma.service';
import type { WhatsAppConversationSummary, WhatsAppMessageRecord, WhatsAppStatus } from '../domain/whatsapp-message';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';
export declare class PrismaWhatsAppMessageRepository extends WhatsAppMessageRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: Omit<WhatsAppMessageRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<WhatsAppMessageRecord>;
    findByWhatsappMessageId(whatsappMessageId: string): Promise<WhatsAppMessageRecord | null>;
    findConversation(phone: string): Promise<WhatsAppMessageRecord[]>;
    listConversations(): Promise<WhatsAppConversationSummary[]>;
    updateStatusByWhatsappMessageId(whatsappMessageId: string, status: WhatsAppStatus): Promise<void>;
    private toRecord;
}
