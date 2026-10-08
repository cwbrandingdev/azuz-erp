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
const CALL_PERMISSION_ERROR = 138006;
let MetaWhatsAppGraphClient = class MetaWhatsAppGraphClient extends whatsapp_graph_gateway_1.WhatsAppGraphGateway {
    http;
    config;
    businessPhoneCache = null;
    callingEnabled = false;
    constructor(http, config) {
        super();
        this.http = http;
        this.config = config;
    }
    async sendText(to, body) {
        this.assertConfigured();
        const data = await this.graphPost(`${this.phoneUrl()}/messages`, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: { preview_url: false, body },
        });
        return {
            whatsappMessageId: data.messages?.[0]?.id ?? null,
            to: data.contacts?.[0]?.wa_id ?? to,
        };
    }
    async getBusinessPhone() {
        if (this.businessPhoneCache) {
            return this.businessPhoneCache;
        }
        this.assertConfigured();
        try {
            const data = await this.graphGet(this.phoneUrl(), {
                fields: 'display_phone_number',
            });
            const display = data.display_phone_number;
            this.businessPhoneCache = display
                ? (0, whatsapp_phone_1.normalizeWhatsAppPhone)(display)
                : this.config.phoneNumberId;
            return this.businessPhoneCache;
        }
        catch {
            return this.config.phoneNumberId;
        }
    }
    async enableCalling() {
        if (this.callingEnabled) {
            return;
        }
        this.assertConfigured();
        await this.graphPost(`${this.phoneUrl()}/settings`, {
            calling: {
                status: 'ENABLED',
                callback_permission_status: 'ENABLED',
                call_icon_visibility: 'DEFAULT',
            },
        });
        this.callingEnabled = true;
    }
    async getCallPermissions(userWaId) {
        this.assertConfigured();
        const data = await this.graphGet(`${this.phoneUrl()}/call_permissions`, { user_wa_id: userWaId });
        const actions = data.actions ?? [];
        return {
            status: data.permission?.status ?? 'no_permission',
            expirationTime: data.permission?.expiration_time ?? null,
            canStartCall: Boolean(actions.find((item) => item.action_name === 'start_call')
                ?.can_perform_action),
            canRequestPermission: Boolean(actions.find((item) => item.action_name === 'send_call_permission_request')?.can_perform_action),
        };
    }
    async sendCallPermissionRequest(to) {
        this.assertConfigured();
        const data = await this.graphPost(`${this.phoneUrl()}/messages`, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'interactive',
            interactive: {
                type: 'call_permission_request',
                action: { name: 'call_permission_request' },
                body: {
                    text: 'Podemos te ligar pelo WhatsApp para continuar o atendimento?',
                },
            },
        });
        return {
            whatsappMessageId: data.messages?.[0]?.id ?? null,
            to: data.contacts?.[0]?.wa_id ?? to,
        };
    }
    async connectCall(to, session) {
        await this.enableCalling().catch(() => undefined);
        const data = await this.graphPost(`${this.phoneUrl()}/calls`, {
            messaging_product: 'whatsapp',
            to,
            action: 'connect',
            session: {
                sdp_type: session.sdpType,
                sdp: session.sdp,
            },
        });
        const callId = data.calls?.[0]?.id;
        if (!callId) {
            throw new common_1.BadGatewayException('WhatsApp did not return a call id');
        }
        return { callId };
    }
    async callAction(callId, action, session) {
        this.assertConfigured();
        await this.graphPost(`${this.phoneUrl()}/calls`, {
            messaging_product: 'whatsapp',
            call_id: callId,
            action,
            ...(session
                ? {
                    session: {
                        sdp_type: session.sdpType,
                        sdp: session.sdp,
                    },
                }
                : {}),
        });
    }
    phoneUrl() {
        return `https://graph.facebook.com/${this.config.graphVersion}/${this.config.phoneNumberId}`;
    }
    authHeaders() {
        return {
            Authorization: `Bearer ${this.config.permanentToken}`,
            'Content-Type': 'application/json',
        };
    }
    async graphGet(url, params) {
        this.assertConfigured();
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                params,
                headers: this.authHeaders(),
            }));
            return response.data;
        }
        catch (error) {
            throw this.toGraphException(error);
        }
    }
    async graphPost(url, body) {
        this.assertConfigured();
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.http.post(url, body, { headers: this.authHeaders() }));
            return response.data;
        }
        catch (error) {
            throw this.toGraphException(error);
        }
    }
    assertConfigured() {
        if (!this.config.isConfigured) {
            throw new common_1.ServiceUnavailableException('WhatsApp is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_PERMANENT_TOKEN)');
        }
    }
    toGraphException(error) {
        const parsed = this.readGraphError(error);
        if (parsed.code === CALL_PERMISSION_ERROR) {
            return new common_1.ForbiddenException({
                message: parsed.message,
                code: 'CALL_PERMISSION_REQUIRED',
            });
        }
        return new common_1.BadGatewayException(parsed.message);
    }
    readGraphError(error) {
        if (typeof error === 'object' &&
            error !== null &&
            'response' in error &&
            typeof error.response === 'object' &&
            error.response !== null &&
            'data' in error.response) {
            const data = error.response.data;
            const message = data.error?.error_user_msg ||
                data.error?.message ||
                'Failed to call WhatsApp Graph API';
            return { message, code: data.error?.code };
        }
        if (error instanceof Error) {
            return { message: error.message };
        }
        return { message: 'Failed to call WhatsApp Graph API' };
    }
};
exports.MetaWhatsAppGraphClient = MetaWhatsAppGraphClient;
exports.MetaWhatsAppGraphClient = MetaWhatsAppGraphClient = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        whatsapp_config_1.WhatsAppConfig])
], MetaWhatsAppGraphClient);
//# sourceMappingURL=meta-whatsapp-graph.client.js.map