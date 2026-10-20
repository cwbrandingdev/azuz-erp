import { HttpService } from '@nestjs/axios';
import { WhatsAppGraphGateway, type WhatsAppDownloadedMedia, type WhatsAppHsmTemplate, type WhatsAppInteractiveOption, type WhatsAppSendResult } from '../domain/whatsapp-graph.gateway';
import { WhatsAppMessageKind } from '../domain/whatsapp-message';
import { WhatsAppConfig } from './whatsapp.config';
export declare class MetaWhatsAppGraphClient extends WhatsAppGraphGateway {
    private readonly http;
    private readonly config;
    private businessPhoneCache;
    private wabaIdCache;
    constructor(http: HttpService, config: WhatsAppConfig);
    sendText(to: string, body: string): Promise<WhatsAppSendResult>;
    sendInteractiveMenu(to: string, bodyText: string, options: WhatsAppInteractiveOption[]): Promise<WhatsAppSendResult>;
    sendMedia(to: string, kind: WhatsAppMessageKind, mediaId: string, options?: {
        caption?: string;
        filename?: string;
    }): Promise<WhatsAppSendResult>;
    sendLocation(to: string, latitude: number, longitude: number, name?: string, address?: string): Promise<WhatsAppSendResult>;
    sendTemplate(to: string, name: string, language: string, bodyParameters: string[]): Promise<WhatsAppSendResult>;
    uploadMedia(buffer: Buffer, mimeType: string, filename: string): Promise<string>;
    downloadMedia(mediaId: string): Promise<WhatsAppDownloadedMedia>;
    listTemplates(): Promise<WhatsAppHsmTemplate[]>;
    getBusinessPhone(): Promise<string>;
    private sendMessage;
    private resolveWabaId;
    private messagesUrl;
    private phoneUrl;
    private assertConfigured;
    private readGraphError;
}
