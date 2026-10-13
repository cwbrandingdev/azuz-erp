import { WhatsAppMessageKind } from './whatsapp-message';
export type MetaInboundMessage = {
    id?: string;
    from?: string;
    type?: string;
    text?: {
        body?: string;
    };
    image?: MetaInboundMedia;
    video?: MetaInboundMedia;
    document?: MetaInboundMedia;
    audio?: MetaInboundMedia;
    sticker?: MetaInboundMedia;
    location?: {
        latitude?: number;
        longitude?: number;
        name?: string;
        address?: string;
    };
};
type MetaInboundMedia = {
    id?: string;
    mime_type?: string;
    filename?: string;
    caption?: string;
    voice?: boolean;
    view_once?: boolean;
    transcript?: string;
    transcription?: {
        text?: string;
    };
};
export type ParsedInboundMessage = {
    kind: WhatsAppMessageKind;
    body: string;
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
export declare function parseInboundMessage(message: MetaInboundMessage): ParsedInboundMessage | null;
export {};
