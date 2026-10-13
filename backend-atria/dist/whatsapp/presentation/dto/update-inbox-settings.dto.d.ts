import { WhatsAppRoutingMode } from '../../domain/whatsapp-routing';
export declare class UpdateInboxSettingsDto {
    routingMode?: WhatsAppRoutingMode;
    slaFirstResponseMinutes?: number;
    autoReassignEnabled?: boolean;
    autoReassignMinutes?: number;
    agentUserIds?: string[];
    botEnabled?: boolean;
    aiAutoReply?: boolean;
}
