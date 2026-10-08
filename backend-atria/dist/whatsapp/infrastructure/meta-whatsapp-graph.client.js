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
exports.MetaWhatsAppGraphClient = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const whatsapp_phone_1 = require("../domain/whatsapp-phone");
const whatsapp_graph_gateway_1 = require("../domain/whatsapp-graph.gateway");
const whatsapp_config_1 = require("./whatsapp.config");
let MetaWhatsAppGraphClient = class MetaWhatsAppGraphClient extends whatsapp_graph_gateway_1.WhatsAppGraphGateway {
    http;
    config;
    businessPhoneCache = null;
    constructor(http, config) {
        super();
        this.http = http;
        this.config = config;
    }
    async sendText(to, body) {
        this.assertConfigured();
        const url = `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}/messages`;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.post(url, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: { preview_url: false, body },
            }, {
                headers: {
                    Authorization: `Bearer ${this.config.permanentToken}`,
                    'Content-Type': 'application/json',
                },
            }));
            const data = response.data;
            return {
                whatsappMessageId: data.messages?.[0]?.id ?? null,
                to: data.contacts?.[0]?.wa_id ?? to,
            };
        }
        catch (error) {
            throw new common_1.BadGatewayException(this.readGraphError(error));
        }
    }
    async getBusinessPhone() {
        if (this.businessPhoneCache) {
            return this.businessPhoneCache;
        }
        this.assertConfigured();
        const url = `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}`;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                params: { fields: 'display_phone_number' },
                headers: {
                    Authorization: `Bearer ${this.config.permanentToken}`,
                },
            }));
            const display = response.data.display_phone_number;
            this.businessPhoneCache = display
                ? (0, whatsapp_phone_1.normalizeWhatsAppPhone)(display)
                : this.config.phoneNumberId;
            return this.businessPhoneCache;
        }
        catch {
            return this.config.phoneNumberId;
        }
    }
    assertConfigured() {
        if (!this.config.isConfigured) {
            throw new common_1.ServiceUnavailableException('WhatsApp is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_PERMANENT_TOKEN)');
        }
    }
    readGraphError(error) {
        if (typeof error === 'object' &&
            error !== null &&
            'response' in error &&
            typeof error.response === 'object' &&
            error.response !== null &&
            'data' in error.response) {
            const data = error.response.data;
            if (data.error?.message) {
                return data.error.message;
            }
        }
        if (error instanceof Error) {
            return error.message;
        }
        return 'Failed to send WhatsApp message';
    }
};
exports.MetaWhatsAppGraphClient = MetaWhatsAppGraphClient;
exports.MetaWhatsAppGraphClient = MetaWhatsAppGraphClient = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        whatsapp_config_1.WhatsAppConfig])
], MetaWhatsAppGraphClient);
//# sourceMappingURL=meta-whatsapp-graph.client.js.map