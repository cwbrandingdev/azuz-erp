import { AiService } from '../../ai/ai.service';
import { type ConversationListFilter, type ConversationPatch, type WhatsAppCannedResponseRecord, type WhatsAppConversationSummary, type WhatsAppMessageRecord } from '../domain/whatsapp-message';
import { type MetaInboundMessage } from '../domain/whatsapp-inbound';
import { WhatsAppGraphGateway } from '../domain/whatsapp-graph.gateway';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';
import { WhatsAppConfig } from '../infrastructure/whatsapp.config';
import { WhatsAppMediaStore } from '../infrastructure/whatsapp-media.store';
import { NotificationsService } from '../../notifications/notifications.service';
import { WhatsAppAutomationService } from './whatsapp-automation.service';
import { WhatsAppRoutingService } from './whatsapp-routing.service';
type MetaWebhookPayload = {
    entry?: Array<{
        changes?: Array<{
            value?: {
                contacts?: Array<{
                    profile?: {
                        name?: string;
                    };
                    wa_id?: string;
                }>;
                messages?: MetaInboundMessage[];
                statuses?: Array<{
                    id?: string;
                    status?: string;
                }>;
            };
        }>;
    }>;
};
export declare class WhatsAppService {
    private readonly messages;
    private readonly graph;
    private readonly config;
    private readonly routing;
    private readonly media;
    private readonly ai;
    private readonly automation;
    private readonly notifications;
    private readonly logger;
    constructor(messages: WhatsAppMessageRepository, graph: WhatsAppGraphGateway, config: WhatsAppConfig, routing: WhatsAppRoutingService, media: WhatsAppMediaStore, ai: AiService, automation: WhatsAppAutomationService, notifications: NotificationsService);
    verifyWebhook(mode: string, token: string, challenge: string): string;
    handleWebhook(payload: MetaWebhookPayload): Promise<void>;
    send(to: string, message: string, userId?: string, agentReply?: boolean): Promise<WhatsAppMessageRecord>;
    sendInteractiveMenu(to: string, bodyText: string, options: Array<{
        id: string;
        title: string;
    }>, userId?: string, agentReply?: boolean): Promise<WhatsAppMessageRecord>;
    sendMedia(to: string, file: Express.Multer.File, caption: string | undefined, userId?: string): Promise<WhatsAppMessageRecord>;
    sendLocation(to: string, latitude: number, longitude: number, name: string | undefined, address: string | undefined, userId?: string): Promise<WhatsAppMessageRecord>;
    sendTemplate(to: string, name: string, language: string, parameters: string[], userId?: string, agentReply?: boolean): Promise<WhatsAppMessageRecord>;
    sendCanned(to: string, cannedId: string, userId?: string): Promise<WhatsAppMessageRecord>;
    listTemplates(): Promise<import("../domain/whatsapp-graph.gateway").WhatsAppHsmTemplate[]>;
    addPrivateNote(phone: string, body: string, userId: string): Promise<WhatsAppMessageRecord>;
    listByPhone(phone: string): Promise<WhatsAppMessageRecord[]>;
    listConversations(filter: ConversationListFilter, companyId?: string): Promise<WhatsAppConversationSummary[]>;
    getConversation(phone: string, companyId?: string): Promise<WhatsAppConversationSummary | null>;
    updateConversation(phone: string, patch: ConversationPatch): Promise<WhatsAppConversationSummary>;
    listCannedResponses(): Promise<WhatsAppCannedResponseRecord[]>;
    createCannedResponse(input: {
        shortCode: string;
        title: string;
        content: string;
        file?: Express.Multer.File;
    }): Promise<WhatsAppCannedResponseRecord>;
    deleteCannedResponse(id: string): Promise<void>;
    private persistOutbound;
    private persistInbound;
    private transcribeLater;
    private persistStatus;
    private emptyMediaFields;
}
export {};
