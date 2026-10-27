"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPunchContext = extractPunchContext;
const MAX_USER_AGENT_LENGTH = 500;
function extractPunchContext(request) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwarded = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor;
    const ipAddress = forwarded?.split(',')[0]?.trim() || request.socket.remoteAddress || null;
    const userAgent = request.headers['user-agent'];
    return {
        ipAddress,
        userAgent: userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
    };
}
//# sourceMappingURL=punch-context.js.map