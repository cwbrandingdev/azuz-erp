"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaTokenExpiredError = void 0;
exports.isMetaTokenExpired = isMetaTokenExpired;
class MetaTokenExpiredError extends Error {
    constructor(message = 'Token de acesso Meta expirado') {
        super(message);
        this.name = 'MetaTokenExpiredError';
    }
}
exports.MetaTokenExpiredError = MetaTokenExpiredError;
function isMetaTokenExpired(error) {
    if (error.code === 190) {
        return true;
    }
    const message = (error.message ?? '').toLowerCase();
    return (message.includes('session has expired') ||
        message.includes('access token has expired') ||
        message.includes('expired access token') ||
        message.includes('invalid oauth access token') ||
        message.includes('error validating access token'));
}
//# sourceMappingURL=meta-token-expired.error.js.map