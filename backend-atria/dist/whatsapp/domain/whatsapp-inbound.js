"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseInboundMessage = parseInboundMessage;
const whatsapp_message_1 = require("./whatsapp-message");
function parseInboundMessage(message) {
    const type = message.type ?? 'text';
    if (type === 'text') {
        const body = message.text?.body?.trim();
        if (!body)
            return null;
        return base({ kind: whatsapp_message_1.WhatsAppMessageKind.TEXT, body });
    }
    if (type === 'location') {
        const latitude = message.location?.latitude;
        const longitude = message.location?.longitude;
        if (latitude == null || longitude == null)
            return null;
        const name = message.location?.name?.trim() || null;
        const address = message.location?.address?.trim() || null;
        return base({
            kind: whatsapp_message_1.WhatsAppMessageKind.LOCATION,
            body: name || address || `${latitude}, ${longitude}`,
            latitude,
            longitude,
            locationName: name,
            locationAddress: address,
        });
    }
    const mediaField = type === 'image'
        ? message.image
        : type === 'video'
            ? message.video
            : type === 'document'
                ? message.document
                : type === 'audio'
                    ? message.audio
                    : type === 'sticker'
                        ? message.sticker
                        : undefined;
    if (!mediaField?.id)
        return null;
    const kind = type === 'image'
        ? whatsapp_message_1.WhatsAppMessageKind.IMAGE
        : type === 'video'
            ? whatsapp_message_1.WhatsAppMessageKind.VIDEO
            : type === 'document'
                ? whatsapp_message_1.WhatsAppMessageKind.DOCUMENT
                : type === 'audio'
                    ? whatsapp_message_1.WhatsAppMessageKind.AUDIO
                    : whatsapp_message_1.WhatsAppMessageKind.STICKER;
    const transcription = mediaField.transcript?.trim() ||
        mediaField.transcription?.text?.trim() ||
        null;
    const caption = mediaField.caption?.trim() || null;
    return base({
        kind,
        body: caption ||
            mediaField.filename ||
            (kind === whatsapp_message_1.WhatsAppMessageKind.IMAGE
                ? 'Imagem'
                : kind === whatsapp_message_1.WhatsAppMessageKind.VIDEO
                    ? 'Vídeo'
                    : kind === whatsapp_message_1.WhatsAppMessageKind.AUDIO
                        ? 'Áudio'
                        : kind === whatsapp_message_1.WhatsAppMessageKind.STICKER
                            ? 'Figurinha'
                            : 'Documento'),
        mediaId: mediaField.id,
        mediaMimeType: mediaField.mime_type ?? null,
        mediaFilename: mediaField.filename ?? null,
        isViewOnce: Boolean(mediaField.view_once),
        isVoiceNote: Boolean(mediaField.voice),
        transcription,
    });
}
function base(partial) {
    return {
        mediaId: null,
        mediaMimeType: null,
        mediaFilename: null,
        latitude: null,
        longitude: null,
        locationName: null,
        locationAddress: null,
        isViewOnce: false,
        isVoiceNote: false,
        transcription: null,
        ...partial,
    };
}
//# sourceMappingURL=whatsapp-inbound.js.map