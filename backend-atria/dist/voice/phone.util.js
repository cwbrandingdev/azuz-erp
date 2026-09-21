"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toE164 = toE164;
exports.maskPhone = maskPhone;
function toE164(phone) {
    if (!phone)
        return null;
    let digits = phone.replace(/\D/g, '');
    if (!digits)
        return null;
    if (digits.startsWith('00')) {
        digits = digits.slice(2);
    }
    if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
        return `+${digits}`;
    }
    if (digits.length === 10 || digits.length === 11) {
        return `+55${digits}`;
    }
    if (digits.length >= 10 && digits.length <= 15) {
        return `+${digits}`;
    }
    return null;
}
function maskPhone(phone) {
    if (phone.length < 6)
        return phone;
    return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}
//# sourceMappingURL=phone.util.js.map