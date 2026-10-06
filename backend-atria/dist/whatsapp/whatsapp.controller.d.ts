import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ListWhatsappConversationsQueryDto } from './dto/list-whatsapp.query';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import { WhatsappService } from './whatsapp.service';
export declare class WhatsappController {
    private readonly whatsappService;
    constructor(whatsappService: WhatsappService);
    getConfig(): Promise<{
        configured: boolean;
        phoneNumberId: string | null;
        webhookUrl: string;
    }>;
    listConversations(user: AuthenticatedUser, query: ListWhatsappConversationsQueryDto): Promise<{
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
    listMessages(user: AuthenticatedUser, id: string): Promise<{
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
}
