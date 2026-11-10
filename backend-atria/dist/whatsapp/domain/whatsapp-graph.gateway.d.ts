import type { WhatsAppMessageKind } from './whatsapp-message';
export type WhatsAppSendResult = {
    whatsappMessageId: string | null;
    to: string;
};
export type WhatsAppDownloadedMedia = {
    buffer: Buffer;
    mimeType: string;
    filename: string;
};
export type WhatsAppInteractiveOption = {
    id: string;
    title: string;
};
export type WhatsAppSessionInfo = {
    configured: boolean;
    name: string;
    status: string | null;
    phone: string | null;
    pushName: string | null;
};
export declare abstract class WhatsAppGraphGateway {
    abstract sendText(to: string, body: string): Promise<WhatsAppSendResult>;
    abstract sendInteractiveMenu(to: string, bodyText: string, options: WhatsAppInteractiveOption[]): Promise<WhatsAppSendResult>;
    abstract sendMedia(to: string, kind: WhatsAppMessageKind, mediaId: string, options?: {
        caption?: string;
        filename?: string;
    }): Promise<WhatsAppSendResult>;
    abstract sendLocation(to: string, latitude: number, longitude: number, name?: string, address?: string): Promise<WhatsAppSendResult>;
    abstract uploadMedia(buffer: Buffer, mimeType: string, filename: string): Promise<string>;
    abstract downloadMedia(mediaId: string): Promise<WhatsAppDownloadedMedia>;
    abstract getBusinessPhone(): Promise<string>;
    abstract getSession(): Promise<WhatsAppSessionInfo>;
    abstract getSessionQr(): Promise<Buffer>;
    abstract restartSession(): Promise<WhatsAppSessionInfo>;
    abstract logoutSession(): Promise<WhatsAppSessionInfo>;
    abstract ensureSession(): Promise<void>;
}
