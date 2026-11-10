import { WhatsAppMessageKind } from './whatsapp-message';
type WahaJid = {
    User?: string;
    Server?: string;
};
export type WahaInboundMessage = {
    id?: string;
    from?: string;
    fromMe?: boolean;
    body?: string;
    hasMedia?: boolean;
    pushName?: string;
    notifyName?: string;
    media?: {
        url?: string;
        mimetype?: string;
        filename?: string | null;
    } | null;
    location?: {
        latitude?: number | string;
        longitude?: number | string;
        description?: string;
        name?: string;
        address?: string;
    } | null;
    _data?: {
        notifyName?: string;
        pushName?: string;
        Info?: {
            PushName?: string;
            Sender?: string | WahaJid;
            SenderAlt?: string | WahaJid;
        };
    };
};
export type ParsedInboundMessage = {
    kind: WhatsAppMessageKind;
    body: string;
    menuSelectionId: string | null;
    mediaId: string | null;
    mediaMimeType: string | null;
    mediaFilename: string | null;
    latitude: number | null;
    longitude: number | null;
    locationName: string | null;
    locationAddress: string | null;
    isViewOnce: boolean;
    isVoiceNote: boolean;
    transcription: string | null;
};
export declare function directChatPhone(from: string | undefined): string | null;
export declare function inboundChatPhone(message: WahaInboundMessage): string | null;
export declare function wahaContactName(message: WahaInboundMessage): string | null;
export declare function parseWahaInbound(message: WahaInboundMessage): ParsedInboundMessage | null;
export {};
