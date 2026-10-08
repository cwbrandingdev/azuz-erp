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
var WhatsAppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_calling_service_1 = require("./whatsapp-calling.service");
const whatsapp_message_1 = require("../domain/whatsapp-message");
const whatsapp_graph_gateway_1 = require("../domain/whatsapp-graph.gateway");
const whatsapp_message_repository_1 = require("../domain/whatsapp-message.repository");
const whatsapp_phone_1 = require("../domain/whatsapp-phone");
const whatsapp_config_1 = require("../infrastructure/whatsapp.config");
let WhatsAppService = WhatsAppService_1 = class WhatsAppService {
    messages;
    graph;
    config;
    calling;
    logger = new common_1.Logger(WhatsAppService_1.name);
    constructor(messages, graph, config, calling) {
        this.messages = messages;
        this.graph = graph;
        this.config = config;
        this.calling = calling;
    }
    verifyWebhook(mode, token, challenge) {
        if (mode === 'subscribe' && token === this.config.verifyToken) {
            return challenge;
        }
        throw new common_1.UnauthorizedException('Verification failed');
    }
    async handleWebhook(payload) {
        try {
            await this.calling.handleWebhook(payload);
        }
        catch (error) {
            this.logger.warn(`WhatsApp call webhook failed: ${error instanceof Error ? error.message : 'unknown'}`);
        }
        const entries = payload.entry ?? [];
        for (const entry of entries) {
            for (const change of entry.changes ?? []) {
                const value = change.value;
                if (!value)
                    continue;
                const contactName = value.contacts?.[0]?.profile?.name ?? null;
                for (const inbound of value.messages ?? []) {
                    await this.persistInbound(inbound, contactName);
                }
                for (const status of value.statuses ?? []) {
                    if (status.type === 'call')
                        continue;
                    await this.persistStatus(status);
                }
            }
        }
    }
    async send(to, message, userId) {
        const recipient = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(to);
        const businessPhone = await this.graph.getBusinessPhone();
        const result = await this.graph.sendText(recipient, message);
        const conversation = await this.messages.upsertConversation({
            phone: recipient,
            preview: message,
            inbound: false,
        });
        return this.messages.create({
            whatsappMessageId: result.whatsappMessageId,
            fromPhone: businessPhone,
            toPhone: result.to,
            body: message,
            direction: whatsapp_message_1.WhatsAppDirection.OUTBOUND,
            status: whatsapp_message_1.WhatsAppStatus.SENT,
            isPrivate: false,
            sentByUserId: userId ?? null,
            conversationId: conversation.id,
        });
    }
    async addPrivateNote(phone, body, userId) {
        const recipient = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(phone);
        const businessPhone = await this.graph.getBusinessPhone();
        const conversation = await this.messages.upsertConversation({
            phone: recipient,
            preview: body,
            inbound: false,
        });
        return this.messages.create({
            whatsappMessageId: null,
            fromPhone: businessPhone,
            toPhone: recipient,
            body,
            direction: whatsapp_message_1.WhatsAppDirection.OUTBOUND,
            status: whatsapp_message_1.WhatsAppStatus.SENT,
            isPrivate: true,
            sentByUserId: userId,
            conversationId: conversation.id,
        });
    }
    async listByPhone(phone) {
        const normalized = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(phone);
        await this.messages.markConversationRead(normalized);
        return this.messages.findConversation(normalized);
    }
    async listConversations(filter) {
        return this.messages.listConversations(filter);
    }
    async getConversation(phone) {
        return this.messages.getConversation((0, whatsapp_phone_1.normalizeWhatsAppPhone)(phone));
    }
    async updateConversation(phone, patch) {
        return this.messages.updateConversation((0, whatsapp_phone_1.normalizeWhatsAppPhone)(phone), patch);
    }
    listCannedResponses() {
        return this.messages.listCannedResponses();
    }
    createCannedResponse(input) {
        return this.messages.createCannedResponse(input);
    }
    deleteCannedResponse(id) {
        return this.messages.deleteCannedResponse(id);
    }
    async persistInbound(message, contactName) {
        const body = (0, whatsapp_message_1.extractInboundText)(message);
        const from = message.from ? (0, whatsapp_phone_1.normalizeWhatsAppPhone)(message.from) : '';
        if (!body || !from) {
            return;
        }
        if (message.id) {
            const existing = await this.messages.findByWhatsappMessageId(message.id);
            if (existing) {
                return;
            }
        }
        const businessPhone = await this.graph.getBusinessPhone();
        const conversation = await this.messages.upsertConversation({
            phone: from,
            name: contactName,
            preview: body,
            inbound: true,
            reopen: true,
        });
        await this.messages.create({
            whatsappMessageId: message.id ?? null,
            fromPhone: from,
            toPhone: businessPhone,
            body,
            direction: whatsapp_message_1.WhatsAppDirection.INBOUND,
            status: whatsapp_message_1.WhatsAppStatus.DELIVERED,
            isPrivate: false,
            sentByUserId: null,
            conversationId: conversation.id,
        });
    }
    async persistStatus(status) {
        if (!status.id) {
            return;
        }
        const mapped = (0, whatsapp_message_1.mapMetaStatus)(status.status);
        if (!mapped) {
            return;
        }
        await this.messages.updateStatusByWhatsappMessageId(status.id, mapped);
    }
};
exports.WhatsAppService = WhatsAppService;
exports.WhatsAppService = WhatsAppService = WhatsAppService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [whatsapp_message_repository_1.WhatsAppMessageRepository,
        whatsapp_graph_gateway_1.WhatsAppGraphGateway,
        whatsapp_config_1.WhatsAppConfig,
        whatsapp_calling_service_1.WhatsAppCallingService])
], WhatsAppService);
//# sourceMappingURL=whatsapp.service.js.map