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
    async sendText(to, body) {
        const phoneNumberId = this.configService
            .get('WHATSAPP_PHONE_NUMBER_ID')
            ?.trim();
        const accessToken = this.configService
            .get('WHATSAPP_ACCESS_TOKEN')
            ?.trim();
        const version = this.configService.get('META_API_VERSION')?.trim() || 'v21.0';
        if (!phoneNumberId || !accessToken) {
            throw new common_1.ServiceUnavailableException('WhatsApp is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN)');
        }
        const recipient = this.normalizeRecipient(to);
        const response = await fetch(`https://graph.facebook.com/${version.replace(/^\/+/, '')}/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipient,
                type: 'text',
                text: { preview_url: false, body },
            }),
        });
        const data = (await response.json().catch(() => null));
        if (!response.ok) {
            throw new common_1.BadGatewayException(data?.error?.message ?? 'Failed to send WhatsApp message');
        }
        return {
            id: data?.messages?.[0]?.id ?? null,
            to: data?.contacts?.[0]?.wa_id ?? recipient,
        };
    }
    normalizeRecipient(input) {
        let digits = input.replace(/\D/g, '');
        if (digits.startsWith('00')) {
            digits = digits.slice(2);
        }
        if (digits.length === 10 || digits.length === 11) {
            digits = `55${digits}`;
        }
        return digits;
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