import { HttpService } from '@nestjs/axios';
import { WhatsAppGraphGateway, type WhatsAppCallPermissionsResult, type WhatsAppCallSession, type WhatsAppSendTextResult } from '../domain/whatsapp-graph.gateway';
import { WhatsAppConfig } from './whatsapp.config';
export declare class MetaWhatsAppGraphClient extends WhatsAppGraphGateway {
    private readonly http;
    private readonly config;
    private businessPhoneCache;
    private callingEnabled;
    constructor(http: HttpService, config: WhatsAppConfig);
    sendText(to: string, body: string): Promise<WhatsAppSendTextResult>;
    getBusinessPhone(): Promise<string>;
    enableCalling(): Promise<void>;
    getCallPermissions(userWaId: string): Promise<WhatsAppCallPermissionsResult>;
    sendCallPermissionRequest(to: string): Promise<WhatsAppSendTextResult>;
    connectCall(to: string, session: WhatsAppCallSession): Promise<{
        callId: string;
    }>;
    callAction(callId: string, action: 'pre_accept' | 'accept' | 'reject' | 'terminate', session?: WhatsAppCallSession): Promise<void>;
    private phoneUrl;
    private authHeaders;
    private graphGet;
    private graphPost;
    private assertConfigured;
    private toGraphException;
    private readGraphError;
}
