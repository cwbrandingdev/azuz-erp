import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { CrmScopeService } from '../leads/crm-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
export declare class WhatsappService {
    private readonly config;
    private readonly prisma;
    private readonly companySettings;
    private readonly crmScope;
    private readonly logger;
    private readonly cloud;
    constructor(config: ConfigService, prisma: PrismaService, companySettings: CompanySettingsService, crmScope: CrmScopeService);
    getPublicConfig(): Promise<{
        configured: boolean;
        phoneNumberId: string | null;
        webhookUrl: string;
    }>;
    verifyWebhook(query: Record<string, unknown>): Promise<string>;
    handleWebhook(req: {
        body?: unknown;
        rawBody?: Buffer;
        headers: {
            [key: string]: string | string[] | undefined;
        };
    }): Promise<{
        received: boolean;
    }>;
    listConversations(user: AuthenticatedUser, filters: {
        leadId?: string;
        clientId?: string;
    }): Promise<{
        id: string;
        waId: string;
        phone: string | null;
        leadId: string | null;
        clientId: string | null;
        lastMessageAt: string;
        lastMessagePreview: string | null;
        unreadCount: number;
        lead: {
            id: string;
            name: string;
            phone: string | null;
        } | null;
        client: {
            id: string;
            name: string;
            phone: string | null;
        } | null;
    }[]>;
    listMessages(user: AuthenticatedUser, conversationId: string): Promise<{
        id: string;
        conversationId: string;
        direction: string;
        type: string;
        body: string | null;
        templateName: string | null;
        waMessageId: string | null;
        status: string;
        errorMessage: string | null;
        createdAt: string;
        sentBy: {
            id: string;
            name: string;
        } | null;
    }[]>;
    sendMessage(user: AuthenticatedUser, dto: SendWhatsappMessageDto): Promise<{
        id: string;
        conversationId: string;
        direction: string;
        type: string;
        body: string | null;
        templateName: string | null;
        waMessageId: string | null;
        status: string;
        errorMessage: string | null;
        createdAt: string;
        sentBy: {
            id: string;
            name: string;
        } | null;
    }>;
    private persistInbound;
    private persistStatus;
    private upsertConversation;
    private findLeadByWaId;
    private findClientByWaId;
    private findLeadForUser;
    private requireCredentials;
    private isConfigured;
    private companyId;
    private buildWebhookUrl;
    private hubQueryValue;
    private header;
    private toConversationResponse;
    private toMessageResponse;
}
