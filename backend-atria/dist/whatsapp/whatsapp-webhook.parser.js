"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWhatsappWebhook = parseWhatsappWebhook;
function mapType(raw) {
    switch (raw) {
        case 'text':
            return 'TEXT';
        case 'image':
            return 'IMAGE';
        case 'audio':
            return 'AUDIO';
        case 'video':
            return 'VIDEO';
        case 'document':
            return 'DOCUMENT';
        case 'sticker':
            return 'STICKER';
        case 'button':
        case 'interactive':
            return 'TEXT';
        default:
            return 'UNKNOWN';
    }
}
function mapStatus(raw) {
    switch (raw) {
        case 'sent':
            return 'SENT';
        case 'delivered':
            return 'DELIVERED';
        case 'read':
            return 'READ';
        case 'failed':
            return 'FAILED';
        default:
            return null;
    }
}
function extractBody(message) {
    return (message.text?.body ||
        message.button?.text ||
        message.interactive?.button_reply?.title ||
        message.image?.caption ||
        message.video?.caption ||
        message.document?.caption ||
        message.document?.filename ||
        (message.type ? `[${message.type}]` : null));
}
function parseWhatsappWebhook(body) {
    const payload = (body ?? {});
    const messages = [];
    const statuses = [];
    for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
            const value = change.value;
            const phoneNumberId = value?.metadata?.phone_number_id?.trim();
            if (!phoneNumberId)
                continue;
            const contactName = value?.contacts?.[0]?.profile?.name ?? null;
            for (const message of value?.messages ?? []) {
                if (!message.id || !message.from)
                    continue;
                messages.push({
                    phoneNumberId,
                    waId: message.from.replace(/\D/g, ''),
                    waMessageId: message.id,
                    timestamp: message.timestamp ?? null,
                    type: mapType(message.type),
                    body: extractBody(message),
                    contactName,
                });
            }
            for (const status of value?.statuses ?? []) {
                const mapped = mapStatus(status.status);
                if (!status.id || !mapped)
                    continue;
                statuses.push({
                    phoneNumberId,
                    waMessageId: status.id,
                    status: mapped,
                    errorMessage: status.errors?.[0]?.title || status.errors?.[0]?.message || null,
                });
            }
        }
    }
    return { messages, statuses };
}
//# sourceMappingURL=whatsapp-webhook.parser.js.map