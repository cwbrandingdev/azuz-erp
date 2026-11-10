"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.directChatPhone = directChatPhone;
exports.inboundChatPhone = inboundChatPhone;
exports.wahaContactName = wahaContactName;
exports.parseWahaInbound = parseWahaInbound;
const whatsapp_message_1 = require("./whatsapp-message");
const whatsapp_phone_1 = require("./whatsapp-phone");
function jidText(value) {
    if (typeof value === 'string')
        return value;
    const user = value?.User?.trim();
    const server = value?.Server?.trim();
    if (user && server)
        return `${user}@${server}`;
    return undefined;
}
function directChatPhone(from) {
    const value = from?.trim() ?? '';
    if (!value || isIgnoredChat(value) || value.endsWith('@lid'))
        return null;
    if (value.endsWith('@c.us') ||
        value.endsWith('@s.whatsapp.net') ||
        /^\d+$/.test(value)) {
        const phone = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(value);
        return phone || null;
    }
    return null;
}
function inboundChatPhone(message) {
    const from = message.from?.trim() ?? '';
    if (isIgnoredChat(from))
        return null;
    const direct = directChatPhone(from);
    if (direct)
        return direct;
    if (!from.endsWith('@lid'))
        return null;
    const info = message._data?.Info;
    return (directChatPhone(jidText(info?.SenderAlt)) ??
        directChatPhone(jidText(info?.Sender)));
}
function isIgnoredChat(value) {
    return (value.endsWith('@g.us') ||
        value.endsWith('@broadcast') ||
        value.includes('@newsletter'));
}
function wahaContactName(message) {
    const name = message.pushName?.trim() ||
        message.notifyName?.trim() ||
        message._data?.pushName?.trim() ||
        message._data?.notifyName?.trim() ||
        message._data?.Info?.PushName?.trim() ||
        '';
    return name || null;
}
function parseWahaInbound(message) {
    const location = message.location;
    const latitude = numberOrNull(location?.latitude);
    const longitude = numberOrNull(location?.longitude);
    if (latitude != null && longitude != null) {
        const name = location?.name?.trim() || location?.description?.trim() || null;
        const address = location?.address?.trim() || null;
        return base({
            kind: whatsapp_message_1.WhatsAppMessageKind.LOCATION,
            body: name || address || `${latitude}, ${longitude}`,
            latitude,
            longitude,
            locationName: name,
            locationAddress: address,
        });
    }
    const mediaUrl = message.media?.url?.trim() || '';
    if (message.hasMedia || mediaUrl) {
        const mimeType = message.media?.mimetype?.trim() || null;
        const filename = message.media?.filename?.trim() || null;
        const kind = mimeType
            ? (0, whatsapp_message_1.kindFromMime)(mimeType)
            : whatsapp_message_1.WhatsAppMessageKind.DOCUMENT;
        const caption = message.body?.trim() || '';
        return base({
            kind,
            body: caption ||
                filename ||
                (kind === whatsapp_message_1.WhatsAppMessageKind.IMAGE
                    ? 'Imagem'
                    : kind === whatsapp_message_1.WhatsAppMessageKind.VIDEO
                        ? 'Vídeo'
                        : kind === whatsapp_message_1.WhatsAppMessageKind.AUDIO
                            ? 'Áudio'
                            : 'Documento'),
            mediaId: mediaUrl || null,
            mediaMimeType: mimeType,
            mediaFilename: filename,
            isVoiceNote: kind === whatsapp_message_1.WhatsAppMessageKind.AUDIO,
        });
    }
    const body = message.body?.trim() ?? '';
    if (!body)
        return null;
    return base({ kind: whatsapp_message_1.WhatsAppMessageKind.TEXT, body });
}
function numberOrNull(value) {
    if (value == null || value === '')
        return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function base(partial) {
    return {
        menuSelectionId: null,
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