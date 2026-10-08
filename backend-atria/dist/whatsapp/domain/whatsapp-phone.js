"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWhatsAppPhone = normalizeWhatsAppPhone;
exports.isSameWhatsAppPhone = isSameWhatsAppPhone;
function normalizeWhatsAppPhone(input) {
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('00')) {
        digits = digits.slice(2);
    }
    if (digits.length === 10 || digits.length === 11) {
        return `55${digits}`;
    }
    return digits;
}
function isSameWhatsAppPhone(left, right) {
    return normalizeWhatsAppPhone(left) === normalizeWhatsAppPhone(right);
}
//# sourceMappingURL=whatsapp-phone.js.map