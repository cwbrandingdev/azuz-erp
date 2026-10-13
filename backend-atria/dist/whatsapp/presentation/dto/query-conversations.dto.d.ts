import { WhatsAppInboxStatus } from '../../domain/whatsapp-message';
import { WhatsAppInboxTab } from '../../domain/whatsapp-routing';
export declare class QueryConversationsDto {
    tab?: WhatsAppInboxTab;
    status?: WhatsAppInboxStatus;
    assignee?: 'mine' | 'unassigned' | 'all';
    q?: string;
    operatorId?: string;
    label?: string;
    stageId?: string;
    source?: string;
    leadStatus?: string;
}
