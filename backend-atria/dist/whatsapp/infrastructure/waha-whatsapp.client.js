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
var WahaWhatsAppClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WahaWhatsAppClient = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const axios_2 = require("axios");
const rxjs_1 = require("rxjs");
const whatsapp_graph_gateway_1 = require("../domain/whatsapp-graph.gateway");
const whatsapp_message_1 = require("../domain/whatsapp-message");
const whatsapp_phone_1 = require("../domain/whatsapp-phone");
const whatsapp_config_1 = require("./whatsapp.config");
const WEBHOOK_EVENTS = [
    'message',
    'message.any',
    'message.ack',
    'session.status',
];
let WahaWhatsAppClient = WahaWhatsAppClient_1 = class WahaWhatsAppClient extends whatsapp_graph_gateway_1.WhatsAppGraphGateway {
    http;
    config;
    logger = new common_1.Logger(WahaWhatsAppClient_1.name);
    pendingMedia = new Map();
    businessPhoneCache = null;
    constructor(http, config) {
        super();
        this.http = http;
        this.config = config;
    }
    async sendText(to, body) {
        await this.ensureSessionRunning();
        const target = await this.resolveOutboundChatId(to);
        const data = await this.post('/api/sendText', {
            session: this.config.session,
            chatId: target.chatId,
            text: body,
        });
        return this.sendResult(target.canonicalPhone, data);
    }
    async sendInteractiveMenu(to, bodyText, options) {
        const lines = options
            .filter((item) => item.id.trim() && item.title.trim())
            .map((item) => `${item.id.trim()}. ${item.title.trim()}`);
        const text = lines.length > 0 ? `${bodyText}\n${lines.join('\n')}` : bodyText;
        return this.sendText(to, text);
    }
    async uploadMedia(buffer, mimeType, filename) {
        const id = (0, crypto_1.randomUUID)();
        this.pendingMedia.set(id, { buffer, mimeType, filename });
        return id;
    }
    async sendMedia(to, kind, mediaId, options) {
        const pending = this.pendingMedia.get(mediaId);
        this.pendingMedia.delete(mediaId);
        if (!pending) {
            throw new common_1.BadRequestException('Mídia do envio não encontrada');
        }
        const endpoint = mediaEndpoint(kind);
        const caption = options?.caption?.trim();
        const target = await this.resolveOutboundChatId(to);
        const data = await this.post(endpoint, {
            session: this.config.session,
            chatId: target.chatId,
            file: {
                mimetype: pending.mimeType,
                filename: options?.filename || pending.filename,
                data: pending.buffer.toString('base64'),
            },
            ...(caption && kind !== whatsapp_message_1.WhatsAppMessageKind.AUDIO ? { caption } : {}),
        });
        return this.sendResult(target.canonicalPhone, data);
    }
    async sendLocation(to, latitude, longitude, name, address) {
        const title = name?.trim() || address?.trim() || undefined;
        const target = await this.resolveOutboundChatId(to);
        const data = await this.post('/api/sendLocation', {
            session: this.config.session,
            chatId: target.chatId,
            latitude,
            longitude,
            ...(title ? { title } : {}),
        });
        return this.sendResult(target.canonicalPhone, data);
    }
    async downloadMedia(mediaId) {
        this.assertConfigured();
        const url = this.resolveMediaUrl(mediaId);
        try {
            const file = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                responseType: 'arraybuffer',
                timeout: 60_000,
                headers: this.authHeaders(),
            }));
            const mimeType = String(file.headers['content-type'] ?? 'application/octet-stream').split(';')[0];
            const filename = filenameFromUrl(url) ||
                `arquivo.${mimeType.split('/')[1] || 'bin'}`;
            return {
                buffer: Buffer.from(file.data),
                mimeType,
                filename,
            };
        }
        catch (error) {
            throw new common_1.BadGatewayException(this.readError(error));
        }
    }
    async getBusinessPhone() {
        if (this.businessPhoneCache)
            return this.businessPhoneCache;
        const session = await this.fetchSession();
        const phone = phoneFromMe(session.me);
        if (phone)
            this.businessPhoneCache = phone;
        return phone;
    }
    async getSession() {
        if (!this.config.isConfigured) {
            return {
                configured: false,
                name: this.config.session,
                status: null,
                phone: null,
                pushName: null,
            };
        }
        try {
            return this.toInfo(await this.fetchSession());
        }
        catch (error) {
            if (this.statusOf(error) === 404) {
                return {
                    configured: true,
                    name: this.config.session,
                    status: 'STOPPED',
                    phone: null,
                    pushName: null,
                };
            }
            throw error;
        }
    }
    async getSessionQr() {
        this.assertConfigured();
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.get(`/api/${encodeURIComponent(this.config.session)}/auth/qr`, {
                baseURL: this.config.baseUrl,
                responseType: 'arraybuffer',
                timeout: 20_000,
                headers: {
                    ...this.authHeaders(),
                    Accept: 'image/png',
                },
            }));
            return Buffer.from(response.data);
        }
        catch (error) {
            throw new common_1.BadRequestException(this.readError(error));
        }
    }
    async restartSession() {
        this.assertConfigured();
        if (!(await this.sessionExists())) {
            await this.createSession();
            this.businessPhoneCache = null;
            return this.getSession();
        }
        const session = await this.fetchSession();
        const action = session.status === 'STOPPED' ? 'start' : 'restart';
        await this.post(`/api/sessions/${encodeURIComponent(this.config.session)}/${action}`, {});
        this.businessPhoneCache = null;
        return this.getSession();
    }
    async logoutSession() {
        this.assertConfigured();
        await this.post(`/api/sessions/${encodeURIComponent(this.config.session)}/logout`, {});
        this.businessPhoneCache = null;
        return this.getSession();
    }
    async ensureSession() {
        if (!this.config.isConfigured) {
            this.logger.warn('WAHA is not configured (WAHA_BASE_URL / WAHA_API_KEY). WhatsApp sends are disabled.');
            return;
        }
        const skipWebhookSync = (process.env.WAHA_SKIP_WEBHOOK_SYNC ?? '').trim() === '1' ||
            (process.env.WAHA_SKIP_WEBHOOK_SYNC ?? '').trim().toLowerCase() === 'true';
        try {
            let session = await this.fetchSession();
            if (!skipWebhookSync) {
                const hooks = session.config?.webhooks ?? [];
                const webhookReady = !this.config.webhookUrl ||
                    hooks.some((hook) => hook.url === this.config.webhookUrl);
                if (!webhookReady) {
                    await this.putSessionConfig();
                    this.logger.log(`WAHA session "${this.config.session}" webhook updated`);
                    session = await this.fetchSession();
                }
            }
            await this.startSessionIfNeeded(session.status);
        }
        catch (error) {
            if (this.statusOf(error) === 404) {
                await this.createSession();
                this.logger.log(`WAHA session "${this.config.session}" created`);
                return;
            }
            this.logger.warn(`WAHA session bootstrap failed: ${this.readError(error)}`);
        }
    }
    async ensureSessionRunning() {
        const session = await this.fetchSession();
        await this.startSessionIfNeeded(session.status);
    }
    async startSessionIfNeeded(status) {
        if (status !== 'STOPPED' && status !== 'FAILED')
            return;
        await this.post(`/api/sessions/${encodeURIComponent(this.config.session)}/start`, {});
    }
    async sessionExists() {
        try {
            await this.fetchSession();
            return true;
        }
        catch (error) {
            if (this.statusOf(error) === 404)
                return false;
            throw error;
        }
    }
    async createSession() {
        await this.post('/api/sessions', {
            name: this.config.session,
            start: true,
            config: this.sessionConfig(),
        });
    }
    async putSessionConfig() {
        await this.request('put', `/api/sessions/${encodeURIComponent(this.config.session)}`, {
            name: this.config.session,
            config: this.sessionConfig(),
        });
    }
    sessionConfig() {
        const webhook = this.config.webhookUrl
            ? {
                url: this.config.webhookUrl,
                events: WEBHOOK_EVENTS,
                ...(this.config.webhookHmacKey
                    ? { hmac: { key: this.config.webhookHmacKey } }
                    : {}),
            }
            : null;
        return {
            webhooks: webhook ? [webhook] : [],
            ignore: {
                status: true,
                groups: true,
                channels: true,
            },
        };
    }
    async fetchSession() {
        return this.request('get', `/api/sessions/${encodeURIComponent(this.config.session)}`);
    }
    toInfo(session) {
        return {
            configured: true,
            name: session.name || this.config.session,
            status: session.status ?? null,
            phone: phoneFromMe(session.me) || null,
            pushName: session.me?.pushName?.trim() || null,
        };
    }
    resolveMediaUrl(mediaId) {
        if (!mediaId.startsWith('http')) {
            return `${this.config.baseUrl}${mediaId.startsWith('/') ? '' : '/'}${mediaId}`;
        }
        try {
            const incoming = new URL(mediaId);
            if (incoming.pathname.startsWith('/api/files')) {
                const base = new URL(this.config.baseUrl);
                return `${base.origin}${incoming.pathname}${incoming.search}`;
            }
        }
        catch {
            return mediaId;
        }
        return mediaId;
    }
    pickCheckExistsResult(result, fallbackPhone) {
        const chatId = result.chatId?.trim() || this.chatId(fallbackPhone);
        const pnDigits = result.pn?.replace(/@c\.us$/i, '').trim();
        const canonicalPhone = pnDigits
            ? (0, whatsapp_phone_1.normalizeWhatsAppPhone)(pnDigits)
            : fallbackPhone;
        return { chatId, canonicalPhone };
    }
    async resolveOutboundChatId(to) {
        const candidates = (0, whatsapp_phone_1.brazilWhatsAppPhoneCandidates)(to);
        let last = null;
        for (const phone of candidates) {
            const result = await this.request('get', `/api/contacts/check-exists?phone=${encodeURIComponent(phone)}&session=${encodeURIComponent(this.config.session)}`);
            last = result;
            if (result.numberExists) {
                return this.pickCheckExistsResult(result, phone);
            }
        }
        this.logger.warn(`check-exists failed after ${candidates.length} candidate(s) for outbound send`);
        throw new common_1.BadRequestException(last?.numberExists === false
            ? 'Este número não está no WhatsApp ou está incorreto. Confira o DDD e o 9 do celular (ex.: 4192534028).'
            : 'Não foi possível validar o número no WhatsApp.');
    }
    chatId(to) {
        return `${(0, whatsapp_phone_1.normalizeWhatsAppPhone)(to)}@c.us`;
    }
    sendResult(to, data) {
        return {
            whatsappMessageId: data.id ?? data.key?.id ?? null,
            to: (0, whatsapp_phone_1.normalizeWhatsAppPhone)(to),
        };
    }
    async post(path, body) {
        return this.request('post', path, body);
    }
    async request(method, path, body) {
        this.assertConfigured();
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.request({
                method,
                url: path,
                baseURL: this.config.baseUrl,
                data: body,
                timeout: 60_000,
                headers: {
                    ...this.authHeaders(),
                    Accept: 'application/json',
                    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
                },
            }));
            return response.data;
        }
        catch (error) {
            if (this.statusOf(error) === 404) {
                throw error;
            }
            const detail = this.readError(error);
            if (this.isRecipientWhatsAppError(detail)) {
                throw new common_1.BadRequestException('Este número não está no WhatsApp ou está incorreto. Confira o DDD e o 9 do celular.');
            }
            if (this.statusOf(error) === 401 || this.statusOf(error) === 403) {
                throw new common_1.BadGatewayException('Falha de autenticação com o WAHA. Confira WAHA_API_KEY.');
            }
            throw new common_1.BadGatewayException(detail);
        }
    }
    authHeaders() {
        return { 'X-Api-Key': this.config.apiKey };
    }
    assertConfigured() {
        if (!this.config.isConfigured) {
            throw new common_1.ServiceUnavailableException('WhatsApp is not configured (WAHA_BASE_URL / WAHA_API_KEY)');
        }
    }
    statusOf(error) {
        if ((0, axios_2.isAxiosError)(error))
            return error.response?.status ?? null;
        return null;
    }
    readError(error) {
        if ((0, axios_2.isAxiosError)(error)) {
            const data = error.response?.data;
            const fromException = data?.exception?.details?.trim() ||
                data?.exception?.message?.trim() ||
                '';
            if (fromException)
                return fromException;
            if (Array.isArray(data?.message))
                return data.message.join(', ');
            if (typeof data?.message === 'string' && data.message)
                return data.message;
            if (typeof data?.error === 'string' && data.error)
                return data.error;
            if (error.message)
                return error.message;
        }
        if (error instanceof Error)
            return error.message;
        return 'WAHA request failed';
    }
    isRecipientWhatsAppError(message) {
        return /recipient is not on whatsapp|no lid found/i.test(message);
    }
};
exports.WahaWhatsAppClient = WahaWhatsAppClient;
exports.WahaWhatsAppClient = WahaWhatsAppClient = WahaWhatsAppClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        whatsapp_config_1.WhatsAppConfig])
], WahaWhatsAppClient);
function mediaEndpoint(kind) {
    if (kind === whatsapp_message_1.WhatsAppMessageKind.IMAGE)
        return '/api/sendImage';
    if (kind === whatsapp_message_1.WhatsAppMessageKind.VIDEO)
        return '/api/sendVideo';
    if (kind === whatsapp_message_1.WhatsAppMessageKind.AUDIO)
        return '/api/sendVoice';
    return '/api/sendFile';
}
function phoneFromMe(me) {
    const id = me?.id?.trim() ?? '';
    if (!id)
        return '';
    return (0, whatsapp_phone_1.normalizeWhatsAppPhone)(id);
}
function filenameFromUrl(url) {
    try {
        const name = new URL(url).pathname.split('/').pop();
        return name ? decodeURIComponent(name) : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=waha-whatsapp.client.js.map