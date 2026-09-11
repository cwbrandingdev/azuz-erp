"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLIC_THROTTLE = exports.AUTH_THROTTLE = void 0;
exports.AUTH_THROTTLE = {
    default: { limit: 10, ttl: 60_000 },
};
exports.PUBLIC_THROTTLE = {
    default: { limit: 30, ttl: 60_000 },
};
//# sourceMappingURL=throttle.js.map