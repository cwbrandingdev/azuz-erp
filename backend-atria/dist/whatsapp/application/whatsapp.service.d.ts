import { type WhatsAppConversationSummary, type WhatsAppMessageRecord } from '../domain/whatsapp-message';
import { WhatsAppGraphGateway } from '../domain/whatsapp-graph.gateway';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';
import { WhatsAppConfig } from '../infrastructure/whatsapp.config';
type MetaWebhookPayload = {
    entry?: Array<{
        changes?: Array<{
            value?: {
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
    send(to: string, message: string): Promise<WhatsAppMessageRecord>;
    listByPhone(phone: string): Promise<WhatsAppMessageRecord[]>;
    listConversations(): Promise<WhatsAppConversationSummary[]>;
    private persistInbound;
    private persistStatus;
}
export {};
