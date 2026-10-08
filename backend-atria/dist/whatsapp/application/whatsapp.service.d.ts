import { type ConversationListFilter, type ConversationPatch, type WhatsAppCannedResponseRecord, type WhatsAppConversationSummary, type WhatsAppMessageRecord } from '../domain/whatsapp-message';
import { WhatsAppGraphGateway } from '../domain/whatsapp-graph.gateway';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';
import { WhatsAppConfig } from '../infrastructure/whatsapp.config';
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
                messages?: Array<{
                    id?: string;
                    from?: string;
                    type?: string;
                    text?: {
                        body?: string;
                    };
                    image?: {
                        caption?: string;
                    };
                }>;
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
    constructor(messages: WhatsAppMessageRepository, graph: WhatsAppGraphGateway, config: WhatsAppConfig);
    verifyWebhook(mode: string, token: string, challenge: string): string;
    handleWebhook(payload: MetaWebhookPayload): Promise<void>;
    send(to: string, message: string, userId?: string): Promise<WhatsAppMessageRecord>;
    addPrivateNote(phone: string, body: string, userId: string): Promise<WhatsAppMessageRecord>;
    listByPhone(phone: string): Promise<WhatsAppMessageRecord[]>;
    listConversations(filter: ConversationListFilter): Promise<WhatsAppConversationSummary[]>;
    getConversation(phone: string): Promise<WhatsAppConversationSummary | null>;
    updateConversation(phone: string, patch: ConversationPatch): Promise<WhatsAppConversationSummary>;
    listCannedResponses(): Promise<WhatsAppCannedResponseRecord[]>;
    createCannedResponse(input: {
        shortCode: string;
        title: string;
        content: string;
    }): Promise<WhatsAppCannedResponseRecord>;
    deleteCannedResponse(id: string): Promise<void>;
    private persistInbound;
    private persistStatus;
}
export {};
