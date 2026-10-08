import { WhatsAppInboxStatus } from '../../domain/whatsapp-message';
export declare class QueryConversationsDto {
    status?: WhatsAppInboxStatus;
    assignee?: 'mine' | 'unassigned' | 'all';
    q?: string;
}
