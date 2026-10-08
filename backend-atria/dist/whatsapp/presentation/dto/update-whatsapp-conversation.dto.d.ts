import { WhatsAppInboxPriority, WhatsAppInboxStatus } from '../../domain/whatsapp-message';
export declare class UpdateWhatsAppConversationDto {
    name?: string;
    status?: WhatsAppInboxStatus;
    priority?: WhatsAppInboxPriority;
    assignedUserId?: string | null;
    labels?: string[];
}
