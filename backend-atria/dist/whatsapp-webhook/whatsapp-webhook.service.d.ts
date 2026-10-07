import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class WhatsappWebhookService {
    private readonly configService;
    private readonly prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    verifyWebhook(mode: string, token: string, challenge: string): string;
    handleIncomingPayload(payload: any): Promise<void>;
    listConversations(companyId: string): Promise<{
        id: string;
        waId: string;
        phone: string | null;
        name: string | null;
        lastMessageAt: Date;
        lastMessagePreview: string | null;
        unreadCount: number;
        createdAt: Date;
    }[]>;
    createConversation(companyId: string, phone: string, name?: string): Promise<{
        id: string;
        waId: string;
        phone: string | null;
        name: string | null;
        lastMessageAt: Date;
        lastMessagePreview: string | null;
        unreadCount: number;
        createdAt: Date;
    }>;
    listMessages(companyId: string, conversationId: string): Promise<{
        id: string;
        conversationId: string;
        direction: string;
        type: string;
        body: string | null;
        waMessageId: string | null;
        status: string;
        createdAt: Date;
    }[]>;
    sendText(companyId: string, userId: string, to: string, body: string): Promise<{
        conversation: {
            id: string;
            waId: string;
            phone: string | null;
            name: string | null;
            lastMessageAt: Date;
            lastMessagePreview: string | null;
            unreadCount: number;
            createdAt: Date;
        };
        message: {
            id: string;
            conversationId: string;
            direction: string;
            type: string;
            body: string | null;
            waMessageId: string | null;
            status: string;
            createdAt: Date;
        };
    }>;
    private persistInbound;
    private persistStatus;
    private resolveInboundCompanyId;
    private upsertConversation;
    private extractBody;
    private mapStatus;
    normalizeRecipient(input: string): string;
    private toConversation;
    private toMessage;
}
