"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.digitsOnly = digitsOnly;
exports.toWhatsappId = toWhatsappId;
exports.previewText = previewText;
exports.lastPhoneDigits = lastPhoneDigits;
const phone_util_1 = require("../voice/phone.util");
function digitsOnly(phone) {
    return (phone ?? '').replace(/\D/g, '');
}
function toWhatsappId(phone) {
    const e164 = (0, phone_util_1.toE164)(phone);
    return e164 ? e164.replace(/^\+/, '') : null;
}
function previewText(value, max = 120) {
    const trimmed = (value ?? '').replace(/\s+/g, ' ').trim();
    if (!trimmed)
        return null;
    return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}
function lastPhoneDigits(waId, length = 8) {
    const digits = digitsOnly(waId);
    return digits.slice(-length);
}
//# sourceMappingURL=whatsapp-phone.util.js.map