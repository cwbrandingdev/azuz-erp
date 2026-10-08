"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIVE_CALL_STATUSES = exports.WhatsAppCallStatus = exports.WhatsAppCallDirection = void 0;
exports.readCallSdp = readCallSdp;
exports.mapCallDirection = mapCallDirection;
var WhatsAppCallDirection;
(function (WhatsAppCallDirection) {
    WhatsAppCallDirection["INBOUND"] = "INBOUND";
    WhatsAppCallDirection["OUTBOUND"] = "OUTBOUND";
})(WhatsAppCallDirection || (exports.WhatsAppCallDirection = WhatsAppCallDirection = {}));
var WhatsAppCallStatus;
(function (WhatsAppCallStatus) {
    WhatsAppCallStatus["CONNECTING"] = "CONNECTING";
    WhatsAppCallStatus["RINGING"] = "RINGING";
    WhatsAppCallStatus["IN_PROGRESS"] = "IN_PROGRESS";
    WhatsAppCallStatus["ENDED"] = "ENDED";
    WhatsAppCallStatus["REJECTED"] = "REJECTED";
    WhatsAppCallStatus["FAILED"] = "FAILED";
})(WhatsAppCallStatus || (exports.WhatsAppCallStatus = WhatsAppCallStatus = {}));
exports.LIVE_CALL_STATUSES = [
    WhatsAppCallStatus.CONNECTING,
    WhatsAppCallStatus.RINGING,
    WhatsAppCallStatus.IN_PROGRESS,
];
function readCallSdp(call) {
    const sdp = call.session?.sdp?.trim() || call.connection?.webrtc?.sdp?.trim() || null;
    const type = call.session?.sdp_type?.trim() || (sdp ? 'unknown' : null);
    return { type, sdp };
}
function mapCallDirection(value) {
    return value === 'USER_INITIATED'
        ? WhatsAppCallDirection.INBOUND
        : WhatsAppCallDirection.OUTBOUND;
}
//# sourceMappingURL=whatsapp-call.js.map