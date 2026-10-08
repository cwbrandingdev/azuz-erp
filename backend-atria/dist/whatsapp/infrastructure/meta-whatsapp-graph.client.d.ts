import { HttpService } from '@nestjs/axios';
import { WhatsAppGraphGateway, type WhatsAppSendTextResult } from '../domain/whatsapp-graph.gateway';
import { WhatsAppConfig } from './whatsapp.config';
export declare class MetaWhatsAppGraphClient extends WhatsAppGraphGateway {
    private readonly http;
    private readonly config;
    private businessPhoneCache;
    constructor(http: HttpService, config: WhatsAppConfig);
    sendText(to: string, body: string): Promise<WhatsAppSendTextResult>;
    getBusinessPhone(): Promise<string>;
    private assertConfigured;
    private readGraphError;
}
