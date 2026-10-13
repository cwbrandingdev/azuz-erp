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
const whatsapp_message_1 = require("../domain/whatsapp-message");
const whatsapp_config_1 = require("./whatsapp.config");
const GRAPH_MEDIA_KINDS = {
    [whatsapp_message_1.WhatsAppMessageKind.IMAGE]: 'image',
    [whatsapp_message_1.WhatsAppMessageKind.DOCUMENT]: 'document',
    [whatsapp_message_1.WhatsAppMessageKind.AUDIO]: 'audio',
    [whatsapp_message_1.WhatsAppMessageKind.VIDEO]: 'video',
    [whatsapp_message_1.WhatsAppMessageKind.STICKER]: 'sticker',
};
let MetaWhatsAppGraphClient = class MetaWhatsAppGraphClient extends whatsapp_graph_gateway_1.WhatsAppGraphGateway {
    http;
    config;
    businessPhoneCache = null;
    wabaIdCache = null;
    constructor(http, config) {
        super();
        this.http = http;
        this.config = config;
    }
    async sendText(to, body) {
        return this.sendMessage(to, {
            type: 'text',
            text: { preview_url: false, body },
        });
    }
    async sendMedia(to, kind, mediaId, options) {
        const type = GRAPH_MEDIA_KINDS[kind];
        if (!type) {
            throw new common_1.BadGatewayException('Unsupported WhatsApp media type');
        }
        const payload = { id: mediaId };
        if (options?.caption && type !== 'audio' && type !== 'sticker') {
            payload.caption = options.caption;
        }
        if (options?.filename && type === 'document') {
            payload.filename = options.filename;
        }
        return this.sendMessage(to, { type, [type]: payload });
    }
    async sendLocation(to, latitude, longitude, name, address) {
        return this.sendMessage(to, {
            type: 'location',
            location: {
                latitude,
                longitude,
                ...(name ? { name } : {}),
                ...(address ? { address } : {}),
            },
        });
    }
    async sendTemplate(to, name, language, bodyParameters) {
        return this.sendMessage(to, {
            type: 'template',
            template: {
                name,
                language: { code: language },
                ...(bodyParameters.length > 0
                    ? {
                        components: [
                            {
                                type: 'body',
                                parameters: bodyParameters.map((text) => ({
                                    type: 'text',
                                    text,
                                })),
                            },
                        ],
                    }
                    : {}),
            },
        });
    }
    async uploadMedia(buffer, mimeType, filename) {
        this.assertConfigured();
        const form = new FormData();
        form.append('messaging_product', 'whatsapp');
        form.append('type', mimeType.split(';')[0].trim());
        form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.post(this.messagesUrl().replace(/\/messages$/, '/media'), form, {
                headers: { Authorization: `Bearer ${this.config.permanentToken}` },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: 60_000,
            }));
            const id = response.data.id;
            if (!id) {
                throw new common_1.BadGatewayException('WhatsApp media upload returned no id');
            }
            return id;
        }
        catch (error) {
            throw new common_1.BadGatewayException(this.readGraphError(error));
        }
    }
    async downloadMedia(mediaId) {
        this.assertConfigured();
        const metaUrl = `https://graph.facebook.com/${this.config.graphVersion}/${mediaId}`;
        try {
            const meta = await (0, rxjs_1.firstValueFrom)(this.http.get(metaUrl, {
                headers: { Authorization: `Bearer ${this.config.permanentToken}` },
            }));
            const fileUrl = meta.data.url;
            if (!fileUrl) {
                throw new common_1.BadGatewayException('WhatsApp media URL missing');
            }
            const file = await (0, rxjs_1.firstValueFrom)(this.http.get(fileUrl, {
                responseType: 'arraybuffer',
                maxRedirects: 5,
                headers: { Authorization: `Bearer ${this.config.permanentToken}` },
                timeout: 60_000,
            }));
            const mimeType = meta.data.mime_type ||
                String(file.headers['content-type'] ?? 'application/octet-stream');
            const ext = mimeType.split('/')[1]?.split(';')[0] || 'bin';
            return {
                buffer: Buffer.from(file.data),
                mimeType,
                filename: `${mediaId}.${ext}`,
            };
        }
        catch (error) {
            throw new common_1.BadGatewayException(this.readGraphError(error));
        }
    }
    async listTemplates() {
        this.assertConfigured();
        const wabaId = await this.resolveWabaId();
        if (!wabaId)
            return [];
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.get(`https://graph.facebook.com/${this.config.graphVersion}/${wabaId}/message_templates`, {
                params: {
                    fields: 'name,status,language,category,components',
                    limit: 100,
                },
                headers: { Authorization: `Bearer ${this.config.permanentToken}` },
            }));
            return (response.data.data ?? [])
                .filter((row) => row.name && row.language)
                .map((row) => ({
                name: row.name,
                language: row.language,
                status: row.status ?? 'UNKNOWN',
                category: row.category ?? 'UTILITY',
                components: row.components ?? [],
            }));
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
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.get(this.phoneUrl(), {
                params: { fields: 'display_phone_number,whatsapp_business_account' },
                headers: {
                    Authorization: `Bearer ${this.config.permanentToken}`,
                },
            }));
            const display = response.data.display_phone_number;
            this.businessPhoneCache = display
                ? (0, whatsapp_phone_1.normalizeWhatsAppPhone)(display)
                : this.config.phoneNumberId;
            if (response.data.whatsapp_business_account?.id) {
                this.wabaIdCache = response.data.whatsapp_business_account.id;
            }
            return this.businessPhoneCache;
        }
        catch {
            return this.config.phoneNumberId;
        }
    }
    async sendMessage(to, payload) {
        this.assertConfigured();
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.post(this.messagesUrl(), {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                ...payload,
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
    async resolveWabaId() {
        if (this.config.wabaId)
            return this.config.wabaId;
        if (this.wabaIdCache)
            return this.wabaIdCache;
        await this.getBusinessPhone();
        return this.wabaIdCache ?? '';
    }
    messagesUrl() {
        return `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}/messages`;
    }
    phoneUrl() {
        return `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}`;
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