"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappCloudClient = exports.WhatsappCloudApiError = void 0;
exports.verifyMetaSignature = verifyMetaSignature;
const crypto_1 = require("crypto");
class WhatsappCloudApiError extends Error {
    status;
    code;
    constructor(message, status, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'WhatsappCloudApiError';
    }
}
exports.WhatsappCloudApiError = WhatsappCloudApiError;
function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
    if (!appSecret)
        return true;
    if (!signatureHeader?.startsWith('sha256='))
        return false;
    const expected = (0, crypto_1.createHmac)('sha256', appSecret)
        .update(rawBody)
        .digest('hex');
    const received = signatureHeader.slice('sha256='.length);
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(received, 'utf8');
    if (expectedBuffer.length !== receivedBuffer.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(expectedBuffer, receivedBuffer);
}
class WhatsappCloudClient {
    apiVersion;
    constructor(apiVersion) {
        this.apiVersion = apiVersion;
    }
    async sendText(accessToken, phoneNumberId, to, body) {
        return this.send(accessToken, phoneNumberId, {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body, preview_url: true },
        });
    }
    async sendTemplate(accessToken, phoneNumberId, to, templateName, languageCode, parameters = []) {
        const payload = {
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
            },
        };
        if (parameters.length > 0) {
            payload.template.components = [
                {
                    type: 'body',
                    parameters: parameters.map((text) => ({ type: 'text', text })),
                },
            ];
        }
        return this.send(accessToken, phoneNumberId, payload);
    }
    async send(accessToken, phoneNumberId, payload) {
        const url = `${this.graphBase()}/${phoneNumberId}/messages`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const json = (await response.json().catch(() => ({})));
        if (!response.ok) {
            const error = json.error;
            throw new WhatsappCloudApiError(error?.error_data?.details ||
                error?.message ||
                `Falha ao enviar WhatsApp (${response.status})`, response.status, error?.code);
        }
        const sent = json;
        return {
            waMessageId: sent.messages?.[0]?.id ?? null,
            waId: sent.contacts?.[0]?.wa_id ?? null,
        };
    }
    async exchangeEmbeddedSignupCode(appId, appSecret, code) {
        const params = new URLSearchParams({
            client_id: appId,
            client_secret: appSecret,
            code,
        });
        const json = await this.requestJson(`/oauth/access_token?${params.toString()}`, { method: 'GET' });
        if (!json.access_token) {
            throw new WhatsappCloudApiError('A Meta não devolveu um access token no Embedded Signup.');
        }
        return json.access_token;
    }
    async subscribeWaba(accessToken, wabaId) {
        await this.requestJson(`/${wabaId}/subscribed_apps`, {
            method: 'POST',
            accessToken,
        });
    }
    async registerPhoneNumber(accessToken, phoneNumberId, pin) {
        try {
            await this.requestJson(`/${phoneNumberId}/register`, {
                method: 'POST',
                accessToken,
                body: { messaging_product: 'whatsapp', pin },
            });
        }
        catch (error) {
            if (error instanceof WhatsappCloudApiError && error.code === 133016) {
                return;
            }
            throw error;
        }
    }
    async requestJson(path, options) {
        const response = await fetch(`${this.graphBase()}${path}`, {
            method: options.method,
            headers: {
                ...(options.accessToken
                    ? { Authorization: `Bearer ${options.accessToken}` }
                    : {}),
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
        const json = (await response.json().catch(() => ({})));
        if (!response.ok) {
            const error = json.error;
            throw new WhatsappCloudApiError(error?.error_data?.details ||
                error?.message ||
                `Falha na Graph API (${response.status})`, response.status, error?.code);
        }
        return json;
    }
    graphBase() {
        const version = this.apiVersion.replace(/^\/+/, '') || 'v21.0';
        return `https://graph.facebook.com/${version}`;
    }
}
exports.WhatsappCloudClient = WhatsappCloudClient;
//# sourceMappingURL=whatsapp-cloud.client.js.map