"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappWebhookService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let WhatsappWebhookService = class WhatsappWebhookService {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    verifyWebhook(mode, token, challenge) {
        const verifyToken = this.configService.get('WEBHOOK_VERIFY_TOKEN');
        if (mode === 'subscribe' && token === verifyToken) {
            return challenge;
        }
        throw new common_1.UnauthorizedException('Verification failed');
    }
    handleIncomingPayload(payload) {
        const entry = payload?.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        if (value?.messages) {
            const message = value.messages[0];
            const from = message.from;
            const text = message.text?.body;
            this.processMessage(from, text);
        }
        if (value?.statuses) {
            const status = value.statuses[0];
            const messageId = status.id;
            const statusType = status.status;
            this.processStatus(messageId, statusType);
        }
    }
    processMessage(from, text) { }
    processStatus(messageId, status) { }
};
exports.WhatsappWebhookService = WhatsappWebhookService;
exports.WhatsappWebhookService = WhatsappWebhookService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WhatsappWebhookService);
//# sourceMappingURL=whatsapp-webhook.service.js.map