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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WhatsAppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const ai_service_1 = require("../../ai/ai.service");
const whatsapp_message_1 = require("../domain/whatsapp-message");
const whatsapp_inbound_1 = require("../domain/whatsapp-inbound");
const whatsapp_graph_gateway_1 = require("../domain/whatsapp-graph.gateway");
const whatsapp_message_repository_1 = require("../domain/whatsapp-message.repository");
const whatsapp_phone_1 = require("../domain/whatsapp-phone");
const whatsapp_config_1 = require("../infrastructure/whatsapp.config");
const whatsapp_media_store_1 = require("../infrastructure/whatsapp-media.store");
const whatsapp_automation_service_1 = require("./whatsapp-automation.service");
const whatsapp_routing_service_1 = require("./whatsapp-routing.service");
let WhatsAppService = WhatsAppService_1 = class WhatsAppService {
    messages;
    graph;
    config;
    routing;
    media;
    ai;
    automation;
    logger = new common_1.Logger(WhatsAppService_1.name);
    constructor(messages, graph, config, routing, media, ai, automation) {
        this.messages = messages;
        this.graph = graph;
        this.config = config;
        this.routing = routing;
        this.media = media;
        this.ai = ai;
        this.automation = automation;
    }
    verifyWebhook(mode, token, challenge) {
        if (mode === 'subscribe' && token === this.config.verifyToken) {
            return challenge;
        }
        throw new common_1.UnauthorizedException('Verification failed');
    }
    async handleWebhook(payload) {
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
                    await this.persistStatus(status);
                }
            }
        }
    }
    async send(to, message, userId, agentReply = true) {
        const recipient = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(to);
        const result = await this.graph.sendText(recipient, message);
        return this.persistOutbound({
            to: result.to,
            body: message,
            userId,
            whatsappMessageId: result.whatsappMessageId,
            agentReply,
        });
    }
    async sendInteractiveMenu(to, bodyText, options, userId, agentReply = true) {
        const recipient = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(to);
        const result = await this.graph.sendInteractiveMenu(recipient, bodyText, options);
        const preview = options.length > 0
            ? `${bodyText}\n${options.map((item) => `• ${item.title}`).join('\n')}`
            : bodyText;
        return this.persistOutbound({
            to: result.to,
            body: preview,
            userId,
            whatsappMessageId: result.whatsappMessageId,
            agentReply,
        });
    }
    async sendMedia(to, file, caption, userId) {
        if (!file?.buffer && !file?.path) {
            throw new common_1.BadRequestException('Arquivo obrigatório');
        }
        const buffer = file.buffer ?? (0, fs_1.readFileSync)(file.path);
        const mimeType = file.mimetype || 'application/octet-stream';
        const filename = file.originalname || 'arquivo';
        const kind = (0, whatsapp_message_1.kindFromMime)(mimeType);
        const stored = this.media.save(buffer, filename, mimeType);
        const recipient = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(to);
        const mediaId = await this.graph.uploadMedia(buffer, mimeType, filename);
        const result = await this.graph.sendMedia(recipient, kind, mediaId, {
            caption,
            filename,
        });
        return this.persistOutbound({
            to: result.to,
            body: caption?.trim() || stored.filename,
            userId,
            whatsappMessageId: result.whatsappMessageId,
            agentReply: true,
            kind,
            mediaUrl: stored.url,
            mediaMimeType: mimeType,
            mediaFilename: filename,
            isVoiceNote: kind === whatsapp_message_1.WhatsAppMessageKind.AUDIO,
        });
    }
    async sendLocation(to, latitude, longitude, name, address, userId) {
        const recipient = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(to);
        const result = await this.graph.sendLocation(recipient, latitude, longitude, name, address);
        return this.persistOutbound({
            to: result.to,
            body: name || address || `${latitude}, ${longitude}`,
            userId,
            whatsappMessageId: result.whatsappMessageId,
            agentReply: true,
            kind: whatsapp_message_1.WhatsAppMessageKind.LOCATION,
            latitude,
            longitude,
            locationName: name ?? null,
            locationAddress: address ?? null,
        });
    }
    async sendTemplate(to, name, language, parameters, userId, agentReply = true) {
        const recipient = (0, whatsapp_phone_1.normalizeWhatsAppPhone)(to);
        const result = await this.graph.sendTemplate(recipient, name, language, parameters);
        const preview = parameters.length > 0
            ? `${name}: ${parameters.join(' · ')}`
            : `Template ${name}`;
        return this.persistOutbound({
            to: result.to,
            body: preview,
            userId,
            whatsappMessageId: result.whatsappMessageId,
            agentReply,
            kind: whatsapp_message_1.WhatsAppMessageKind.TEMPLATE,
            templateName: name,
            templateLanguage: language,
        });
    }
    async sendCanned(to, cannedId, userId) {
        const canned = (await this.messages.listCannedResponses()).find((item) => item.id === cannedId);
        if (!canned) {
            throw new common_1.BadRequestException('Resposta pronta não encontrada');
        }
        if (canned.mediaUrl) {
            const path = this.media.resolvePath(canned.mediaUrl);
            if (!path) {
                throw new common_1.BadRequestException('Mídia da resposta pronta inválida');
            }
            const buffer = (0, fs_1.readFileSync)(path);
            const mimeType = canned.mediaMimeType || 'application/octet-stream';
            const filename = canned.mediaFilename || 'arquivo';
            return this.sendMedia(to, {
                buffer,
                mimetype: mimeType,
                originalname: filename,
                path,
            }, canned.content, userId);
        }
        return this.send(to, canned.content, userId);
    }
    listTemplates() {
        return this.graph.listTemplates();
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
            ...this.emptyMediaFields(),
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
    async listConversations(filter, companyId) {
        const settings = await this.routing.getSettings(companyId ?? '00000000-0000-4000-8000-000000000001');
        const rows = await this.messages.listConversations({
            ...filter,
            slaMinutes: settings.slaFirstResponseMinutes,
        });
        const withLeads = await this.routing.attachLeads(rows, companyId ?? '00000000-0000-4000-8000-000000000001');
        return withLeads.filter((item) => {
            if (filter.stageId && item.lead?.stageId !== filter.stageId)
                return false;
            if (filter.source &&
                item.lead?.source?.toLowerCase() !== filter.source.toLowerCase()) {
                return false;
            }
            if (filter.leadStatus && item.lead?.status !== filter.leadStatus) {
                return false;
            }
            return true;
        });
    }
    async getConversation(phone, companyId) {
        const conversation = await this.messages.getConversation((0, whatsapp_phone_1.normalizeWhatsAppPhone)(phone));
        if (!conversation)
            return null;
        const settings = await this.routing.getSettings(companyId ?? '00000000-0000-4000-8000-000000000001');
        conversation.slaBreached =
            conversation.waitingSeconds > settings.slaFirstResponseMinutes * 60;
        const [enriched] = await this.routing.attachLeads([conversation], companyId ?? '00000000-0000-4000-8000-000000000001');
        return enriched;
    }
    async updateConversation(phone, patch) {
        return this.messages.updateConversation((0, whatsapp_phone_1.normalizeWhatsAppPhone)(phone), patch);
    }
    listCannedResponses() {
        return this.messages.listCannedResponses();
    }
    createCannedResponse(input) {
        let mediaUrl = null;
        let mediaMimeType = null;
        let mediaFilename = null;
        let kind = whatsapp_message_1.WhatsAppMessageKind.TEXT;
        if (input.file) {
            const buffer = input.file.buffer ?? (0, fs_1.readFileSync)(input.file.path);
            const stored = this.media.save(buffer, input.file.originalname, input.file.mimetype);
            mediaUrl = stored.url;
            mediaMimeType = input.file.mimetype;
            mediaFilename = input.file.originalname;
            kind = (0, whatsapp_message_1.kindFromMime)(input.file.mimetype);
        }
        if (!input.content.trim() && !mediaUrl) {
            throw new common_1.BadRequestException('Informe texto ou um arquivo');
        }
        return this.messages.createCannedResponse({
            shortCode: input.shortCode,
            title: input.title,
            content: input.content,
            kind,
            mediaUrl,
            mediaMimeType,
            mediaFilename,
        });
    }
    deleteCannedResponse(id) {
        return this.messages.deleteCannedResponse(id);
    }
    async persistOutbound(input) {
        const businessPhone = await this.graph.getBusinessPhone();
        const conversation = await this.messages.upsertConversation({
            phone: input.to,
            preview: input.body,
            inbound: false,
            agentReply: input.agentReply,
        });
        return this.messages.create({
            ...this.emptyMediaFields(),
            whatsappMessageId: input.whatsappMessageId,
            fromPhone: businessPhone,
            toPhone: input.to,
            body: input.body,
            kind: input.kind ?? whatsapp_message_1.WhatsAppMessageKind.TEXT,
            mediaUrl: input.mediaUrl ?? null,
            mediaMimeType: input.mediaMimeType ?? null,
            mediaFilename: input.mediaFilename ?? null,
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
            locationName: input.locationName ?? null,
            locationAddress: input.locationAddress ?? null,
            isVoiceNote: input.isVoiceNote ?? false,
            templateName: input.templateName ?? null,
            templateLanguage: input.templateLanguage ?? null,
            direction: whatsapp_message_1.WhatsAppDirection.OUTBOUND,
            status: whatsapp_message_1.WhatsAppStatus.SENT,
            isPrivate: false,
            sentByUserId: input.userId ?? null,
            conversationId: conversation.id,
        });
    }
    async persistInbound(message, contactName) {
        const parsed = (0, whatsapp_inbound_1.parseInboundMessage)(message);
        const from = message.from ? (0, whatsapp_phone_1.normalizeWhatsAppPhone)(message.from) : '';
        if (!parsed || !from) {
            return;
        }
        if (message.id) {
            const existing = await this.messages.findByWhatsappMessageId(message.id);
            if (existing) {
                return;
            }
        }
        let mediaUrl = null;
        let mediaMimeType = parsed.mediaMimeType;
        let mediaFilename = parsed.mediaFilename;
        let transcription = parsed.transcription;
        let downloaded = null;
        if (parsed.mediaId) {
            try {
                const file = await this.graph.downloadMedia(parsed.mediaId);
                const stored = this.media.save(file.buffer, file.filename, file.mimeType);
                mediaUrl = stored.url;
                mediaMimeType = file.mimeType;
                mediaFilename = parsed.mediaFilename || file.filename;
                downloaded = { buffer: file.buffer, mimeType: file.mimeType };
            }
            catch (error) {
                this.logger.warn(`Failed to download WhatsApp media ${parsed.mediaId}: ${error instanceof Error ? error.message : error}`);
            }
        }
        const businessPhone = await this.graph.getBusinessPhone();
        const conversation = await this.messages.upsertConversation({
            phone: from,
            name: contactName,
            preview: parsed.body,
            inbound: true,
            reopen: true,
        });
        const [withLead] = await this.routing.attachLeads([conversation]);
        const created = await this.messages.create({
            ...this.emptyMediaFields(),
            whatsappMessageId: message.id ?? null,
            fromPhone: from,
            toPhone: businessPhone,
            body: parsed.body,
            kind: parsed.kind,
            mediaUrl,
            mediaMimeType,
            mediaFilename,
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            locationName: parsed.locationName,
            locationAddress: parsed.locationAddress,
            isViewOnce: parsed.isViewOnce,
            isVoiceNote: parsed.isVoiceNote,
            transcription,
            direction: whatsapp_message_1.WhatsAppDirection.INBOUND,
            status: whatsapp_message_1.WhatsAppStatus.DELIVERED,
            isPrivate: false,
            sentByUserId: null,
            conversationId: conversation.id,
        });
        if (parsed.isVoiceNote && !transcription && downloaded) {
            void this.transcribeLater(created.id, downloaded.buffer, downloaded.mimeType);
        }
        const automationBody = parsed.menuSelectionId ??
            parsed.transcription ??
            parsed.body;
        void this.automation
            .handleInbound({
            phone: from,
            body: automationBody,
            conversation: withLead,
        })
            .catch((error) => this.logger.warn(`Automation inbound failed: ${error instanceof Error ? error.message : error}`));
    }
    async transcribeLater(messageId, buffer, mimeType) {
        try {
            const text = await this.ai.transcribeAudio(buffer, mimeType);
            if (text) {
                await this.messages.updateMessage(messageId, { transcription: text });
            }
        }
        catch (error) {
            this.logger.warn(`Voice transcription failed: ${error instanceof Error ? error.message : error}`);
        }
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
        void this.automation
            .onMessageStatus(status.id, mapped)
            .catch((error) => this.logger.warn(`Automation status failed: ${error instanceof Error ? error.message : error}`));
    }
    emptyMediaFields() {
        return {
            kind: whatsapp_message_1.WhatsAppMessageKind.TEXT,
            mediaUrl: null,
            mediaMimeType: null,
            mediaFilename: null,
            latitude: null,
            longitude: null,
            locationName: null,
            locationAddress: null,
            isViewOnce: false,
            isVoiceNote: false,
            transcription: null,
            templateName: null,
            templateLanguage: null,
        };
    }
};
exports.WhatsAppService = WhatsAppService;
exports.WhatsAppService = WhatsAppService = WhatsAppService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, common_1.Inject)((0, common_1.forwardRef)(() => whatsapp_automation_service_1.WhatsAppAutomationService))),
    __metadata("design:paramtypes", [whatsapp_message_repository_1.WhatsAppMessageRepository,
        whatsapp_graph_gateway_1.WhatsAppGraphGateway,
        whatsapp_config_1.WhatsAppConfig,
        whatsapp_routing_service_1.WhatsAppRoutingService,
        whatsapp_media_store_1.WhatsAppMediaStore,
        ai_service_1.AiService,
        whatsapp_automation_service_1.WhatsAppAutomationService])
], WhatsAppService);
//# sourceMappingURL=whatsapp.service.js.map