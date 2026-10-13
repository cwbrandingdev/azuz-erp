"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppMessageKind = exports.WhatsAppInboxPriority = exports.WhatsAppInboxStatus = exports.WhatsAppStatus = exports.WhatsAppDirection = void 0;
exports.mapMetaStatus = mapMetaStatus;
exports.kindFromMime = kindFromMime;
var WhatsAppDirection;
(function (WhatsAppDirection) {
    WhatsAppDirection["INBOUND"] = "INBOUND";
    WhatsAppDirection["OUTBOUND"] = "OUTBOUND";
})(WhatsAppDirection || (exports.WhatsAppDirection = WhatsAppDirection = {}));
var WhatsAppStatus;
(function (WhatsAppStatus) {
    WhatsAppStatus["SENT"] = "SENT";
    WhatsAppStatus["DELIVERED"] = "DELIVERED";
    WhatsAppStatus["READ"] = "READ";
    WhatsAppStatus["FAILED"] = "FAILED";
})(WhatsAppStatus || (exports.WhatsAppStatus = WhatsAppStatus = {}));
var WhatsAppInboxStatus;
(function (WhatsAppInboxStatus) {
    WhatsAppInboxStatus["OPEN"] = "OPEN";
    WhatsAppInboxStatus["PENDING"] = "PENDING";
    WhatsAppInboxStatus["RESOLVED"] = "RESOLVED";
    WhatsAppInboxStatus["SNOOZED"] = "SNOOZED";
})(WhatsAppInboxStatus || (exports.WhatsAppInboxStatus = WhatsAppInboxStatus = {}));
var WhatsAppInboxPriority;
(function (WhatsAppInboxPriority) {
    WhatsAppInboxPriority["NONE"] = "NONE";
    WhatsAppInboxPriority["LOW"] = "LOW";
    WhatsAppInboxPriority["MEDIUM"] = "MEDIUM";
    WhatsAppInboxPriority["HIGH"] = "HIGH";
    WhatsAppInboxPriority["URGENT"] = "URGENT";
})(WhatsAppInboxPriority || (exports.WhatsAppInboxPriority = WhatsAppInboxPriority = {}));
var WhatsAppMessageKind;
(function (WhatsAppMessageKind) {
    WhatsAppMessageKind["TEXT"] = "TEXT";
    WhatsAppMessageKind["IMAGE"] = "IMAGE";
    WhatsAppMessageKind["DOCUMENT"] = "DOCUMENT";
    WhatsAppMessageKind["AUDIO"] = "AUDIO";
    WhatsAppMessageKind["VIDEO"] = "VIDEO";
    WhatsAppMessageKind["LOCATION"] = "LOCATION";
    WhatsAppMessageKind["TEMPLATE"] = "TEMPLATE";
    WhatsAppMessageKind["STICKER"] = "STICKER";
})(WhatsAppMessageKind || (exports.WhatsAppMessageKind = WhatsAppMessageKind = {}));
function mapMetaStatus(status) {
    if (status === 'sent')
        return WhatsAppStatus.SENT;
    if (status === 'delivered')
        return WhatsAppStatus.DELIVERED;
    if (status === 'read')
        return WhatsAppStatus.READ;
    if (status === 'failed')
        return WhatsAppStatus.FAILED;
    return null;
}
function kindFromMime(mimeType) {
    const mime = mimeType?.split(';')[0].trim().toLowerCase() ?? '';
    if (mime.startsWith('image/'))
        return WhatsAppMessageKind.IMAGE;
    if (mime.startsWith('audio/'))
        return WhatsAppMessageKind.AUDIO;
    if (mime.startsWith('video/'))
        return WhatsAppMessageKind.VIDEO;
    return WhatsAppMessageKind.DOCUMENT;
}
//# sourceMappingURL=whatsapp-message.js.map