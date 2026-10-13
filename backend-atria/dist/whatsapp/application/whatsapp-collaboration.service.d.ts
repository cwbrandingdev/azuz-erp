import { AiService } from '../../ai/ai.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
export declare class WhatsAppCollaborationService {
    private readonly prisma;
    private readonly whatsApp;
    private readonly notifications;
    private readonly ai;
    private readonly logger;
    constructor(prisma: PrismaService, whatsApp: WhatsAppService, notifications: NotificationsService, ai: AiService);
    addPrivateNote(input: {
        companyId?: string;
        phone: string;
        message: string;
        userId: string;
    }): Promise<import("../domain/whatsapp-message").WhatsAppMessageRecord>;
    transfer(input: {
        companyId?: string;
        phone: string;
        note: string;
        actorUserId: string;
        targetUserId?: string | null;
        targetUserGroupId?: string | null;
    }): Promise<{
        conversation: import("../domain/whatsapp-message").WhatsAppConversationSummary | null;
        note: import("../domain/whatsapp-message").WhatsAppMessageRecord;
        assignedTo: {
            userId: string;
            label: string;
        };
    }>;
    copilot(input: {
        phone: string;
        action: 'suggest' | 'rewrite' | 'grammar' | 'tone' | 'summarize';
        text?: string;
        tone?: 'formal' | 'casual' | 'empathetic';
    }): Promise<{
        text: string;
    }>;
    private notifyMentions;
    private resolveTransferTarget;
    private recentTranscript;
}
