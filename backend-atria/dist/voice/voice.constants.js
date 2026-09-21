"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCKED_AGENT_OUTCOMES = exports.AGENT_CALL_OUTCOMES = void 0;
exports.AGENT_CALL_OUTCOMES = [
    'NO_ANSWER',
    'BUSY',
    'FAILED',
    'COMPLETED',
    'NO_INTEREST',
    'INTERESTED',
    'WHATSAPP',
    'MEETING',
    'SKIPPED',
];
exports.LOCKED_AGENT_OUTCOMES = new Set([
    'NO_INTEREST',
    'INTERESTED',
    'WHATSAPP',
    'MEETING',
    'SKIPPED',
]);
//# sourceMappingURL=voice.constants.js.map