import { PrismaService } from '../../prisma/prisma.service';
import { type WhatsAppCallPermission, type WhatsAppCallRecord, type WhatsAppWebhookCall, type WhatsAppWebhookCallStatus } from '../domain/whatsapp-call';
import { WhatsAppGraphGateway } from '../domain/whatsapp-graph.gateway';
import { WhatsAppMessageRepository } from '../domain/whatsapp-message.repository';
type CallWebhookPayload = {
    entry?: Array<{
        changes?: Array<{
            field?: string;
            value?: {
                calls?: WhatsAppWebhookCall[];
                statuses?: WhatsAppWebhookCallStatus[];
                contacts?: Array<{
                    profile?: {
                        name?: string;
                    };
                    wa_id?: string;
                }>;
            };
        }>;
    }>;
};
export declare class WhatsAppCallingService {
    private readonly prisma;
    private readonly graph;
    private readonly messages;
    private readonly logger;
    constructor(prisma: PrismaService, graph: WhatsAppGraphGateway, messages: WhatsAppMessageRepository);
    handleWebhook(payload: CallWebhookPayload): Promise<void>;
    listLive(): Promise<WhatsAppCallRecord[]>;
    getById(id: string): Promise<WhatsAppCallRecord>;
    getPermissions(phone: string): Promise<WhatsAppCallPermission>;
    requestPermission(phone: string, userId?: string): Promise<{
        alreadyGranted: boolean;
        permissions: import("../domain/whatsapp-graph.gateway").WhatsAppCallPermissionsResult;
    }>;
    initiate(to: string, sdp: string, userId?: string): Promise<WhatsAppCallRecord>;
    answer(id: string, sdp: string): Promise<WhatsAppCallRecord>;
    reject(id: string): Promise<WhatsAppCallRecord>;
    hangup(id: string): Promise<WhatsAppCallRecord>;
    private persistCallEvent;
    private persistCallStatus;
    private mapLiveStatus;
    private mapTerminateStatus;
    private requireCall;
    private noteCall;
    private secondsBetween;
    private formatDuration;
    private toRecord;
}
export {};
