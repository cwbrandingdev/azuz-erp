"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firstQueryValue = firstQueryValue;
function firstQueryValue(value) {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            if (typeof item === 'string' && item.trim()) {
                return item.trim();
            }
        }
        return undefined;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || undefined;
    }
    return undefined;
}
//# sourceMappingURL=query-param.js.map