import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateWhatsappConversationDto } from './dto/create-whatsapp-conversation.dto';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
export declare class WhatsappController {
    private readonly webhookService;
    constructor(webhookService: WhatsappWebhookService);
    listConversations(user: AuthenticatedUser): Promise<{
        id: string;
        waId: string;
        phone: string | null;
        name: string | null;
        lastMessageAt: Date;
        lastMessagePreview: string | null;
        unreadCount: number;
        createdAt: Date;
    }[]>;
    createConversation(user: AuthenticatedUser, dto: CreateWhatsappConversationDto): Promise<{
        id: string;
        waId: string;
        phone: string | null;
        name: string | null;
        lastMessageAt: Date;
        lastMessagePreview: string | null;
        unreadCount: number;
        createdAt: Date;
    }>;
    listMessages(user: AuthenticatedUser, id: string): Promise<{
        id: string;
        conversationId: string;
        direction: string;
        type: string;
        body: string | null;
        waMessageId: string | null;
        status: string;
        createdAt: Date;
    }[]>;
    send(user: AuthenticatedUser, dto: SendWhatsappMessageDto): Promise<{
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
    private companyId;
}
