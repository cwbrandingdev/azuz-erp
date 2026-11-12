"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWhatsAppPhone = normalizeWhatsAppPhone;
exports.isSameWhatsAppPhone = isSameWhatsAppPhone;
exports.brazilWhatsAppPhoneCandidates = brazilWhatsAppPhoneCandidates;
exports.validateNormalizedWhatsAppPhone = validateNormalizedWhatsAppPhone;
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
function brazilWhatsAppPhoneCandidates(input) {
    const raw = input.replace(/\D/g, '');
    const normalized = normalizeWhatsAppPhone(input);
    const out = [];
    const push = (value) => {
        const digits = value.replace(/\D/g, '');
        if (digits.length >= 10 && !out.includes(digits))
            out.push(digits);
    };
    push(normalized);
    if (raw.length >= 10 && raw.length <= 11)
        push(raw);
    if (normalized.startsWith('55') && normalized.length === 13) {
        push(normalized.slice(0, 4) + normalized.slice(5));
    }
    if (normalized.startsWith('55') && normalized.length === 14) {
        push(normalized.slice(0, 12));
        push(normalized.slice(0, 4) + normalized.slice(5, 13));
    }
    return out;
}
function validateNormalizedWhatsAppPhone(input) {
    const raw = input.replace(/\D/g, '');
    if (raw.length < 10) {
        return 'Informe DDD + número (mínimo 10 dígitos).';
    }
    const digits = normalizeWhatsAppPhone(input);
    if (digits.startsWith('55') && digits.length > 13) {
        return 'Número longo demais. Confira os dígitos.';
    }
    return null;
}
//# sourceMappingURL=whatsapp-phone.js.map