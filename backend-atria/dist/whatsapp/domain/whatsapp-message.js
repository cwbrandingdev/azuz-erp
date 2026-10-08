"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppInboxPriority = exports.WhatsAppInboxStatus = exports.WhatsAppStatus = exports.WhatsAppDirection = void 0;
exports.mapMetaStatus = mapMetaStatus;
exports.extractInboundText = extractInboundText;
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
function extractInboundText(message) {
    if (message.type === 'text' && message.text?.body) {
        return message.text.body;
    }
    if (message.type === 'image' && message.image?.caption) {
        return message.image.caption;
    }
    return null;
}
//# sourceMappingURL=whatsapp-message.js.map