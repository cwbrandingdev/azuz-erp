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
var WhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const company_constants_1 = require("../company/company.constants");
const company_settings_service_1 = require("../company-settings/company-settings.service");
const crm_scope_service_1 = require("../leads/crm-scope.service");
const prisma_service_1 = require("../prisma/prisma.service");
const whatsapp_cloud_client_1 = require("./whatsapp-cloud.client");
const whatsapp_phone_util_1 = require("./whatsapp-phone.util");
const whatsapp_webhook_parser_1 = require("./whatsapp-webhook.parser");
let WhatsappService = WhatsappService_1 = class WhatsappService {
    config;
    prisma;
    companySettings;
    crmScope;
    logger = new common_1.Logger(WhatsappService_1.name);
    cloud;
    constructor(config, prisma, companySettings, crmScope) {
        this.config = config;
        this.prisma = prisma;
        this.companySettings = companySettings;
        this.crmScope = crmScope;
        this.cloud = new whatsapp_cloud_client_1.WhatsappCloudClient(this.config.get('META_API_VERSION')?.trim() || 'v21.0');
    }
    async getPublicConfig() {
        const credentials = await this.companySettings.getWhatsappCredentialsForCurrentTenant();
        return {
            configured: this.isConfigured(credentials),
            phoneNumberId: credentials.phoneNumberId,
            webhookUrl: this.buildWebhookUrl(),
            embeddedSignup: await this.companySettings.getWhatsappEmbeddedSignupPublicConfig(),
        };
    }
    async completeEmbeddedSignup(dto) {
        const auth = await this.companySettings.getMetaAppAuthForCurrentTenant();
        if (!auth.appId || !auth.appSecret) {
            throw new common_1.ServiceUnavailableException('Preencha App ID e App Secret do WhatsApp em Integrações APIs para conectar pelo QR.');
        }
        const code = dto.code.trim();
        const wabaId = dto.wabaId.trim();
        const phoneNumberId = dto.phoneNumberId.trim();
        if (!code || !wabaId || !phoneNumberId) {
            throw new common_1.BadRequestException('O popup da Meta não devolveu code, WABA ID e Phone Number ID.');
        }
        let accessToken;
        try {
            accessToken = await this.cloud.exchangeEmbeddedSignupCode(auth.appId, auth.appSecret, code);
        }
        catch (error) {
            throw new common_1.ServiceUnavailableException(error instanceof whatsapp_cloud_client_1.WhatsappCloudApiError
                ? error.message
                : 'Não foi possível trocar o código do Embedded Signup por um token.');
        }
        try {
            await this.cloud.subscribeWaba(accessToken, wabaId);
        }
        catch (error) {
            this.logger.warn(`Falha ao inscrever webhooks da WABA ${wabaId}: ${error instanceof Error ? error.message : String(error)}`);
        }
        try {
            await this.cloud.registerPhoneNumber(accessToken, phoneNumberId, dto.pin?.trim() || '000000');
        }
        catch (error) {
            this.logger.warn(`Registro do número ${phoneNumberId}: ${error instanceof Error ? error.message : String(error)}`);
        }
        await this.companySettings.saveWhatsappConnection({
            accessToken,
            phoneNumberId,
            businessAccountId: wabaId,
        });
        this.logger.log(`WhatsApp conectado via Embedded Signup (WABA ${wabaId}, phone ${phoneNumberId}).`);
        return this.getPublicConfig();
    }
    async verifyWebhook(query) {
        const mode = this.hubQueryValue(query, 'mode');
        const token = this.hubQueryValue(query, 'verify_token');
        const challenge = this.hubQueryValue(query, 'challenge');
        if (mode !== 'subscribe' || !token || !challenge) {
            throw new common_1.BadRequestException('Parâmetros de verificação inválidos.');
        }
        const envToken = this.config.get('WHATSAPP_VERIFY_TOKEN')?.trim();
        if (envToken && envToken === token) {
            return challenge;
        }
        const match = await this.companySettings.findWhatsappCredentialsByVerifyToken(token);
        if (!match) {
            throw new common_1.ForbiddenException('Verify token do WhatsApp não confere.');
        }
        return challenge;
    }
    async handleWebhook(req) {
        const { messages, statuses } = (0, whatsapp_webhook_parser_1.parseWhatsappWebhook)(req.body);
        const phoneNumberId = messages[0]?.phoneNumberId || statuses[0]?.phoneNumberId;
        if (!phoneNumberId) {
            return { received: true };
        }
        const credentials = (await this.companySettings.findWhatsappCredentialsByPhoneNumberId(phoneNumberId)) ??
            (await this.companySettings.getWhatsappCredentialsForCurrentTenant());
        if (credentials.phoneNumberId &&
            credentials.phoneNumberId !== phoneNumberId) {
            this.logger.warn(`Webhook WhatsApp ignorado: phone_number_id ${phoneNumberId} não mapeado.`);
            return { received: true };
        }
        const signature = this.header(req.headers, 'x-hub-signature-256');
        const rawBody = req.rawBody;
        if (rawBody &&
            !(0, whatsapp_cloud_client_1.verifyMetaSignature)(rawBody, signature, credentials.metaAppSecret)) {
            throw new common_1.ForbiddenException('Assinatura do webhook WhatsApp inválida.');
        }
        for (const inbound of messages) {
            await this.persistInbound(credentials.companyId, inbound);
        }
        for (const status of statuses) {
            await this.persistStatus(credentials.companyId, status);
        }
        return { received: true };
    }
    async listConversations(user, filters) {
        if (filters.leadId) {
            await this.findLeadForUser(user, filters.leadId);
        }
        const conversations = await this.prisma.whatsappConversation.findMany({
            where: {
                companyId: this.companyId(user),
                ...(filters.leadId ? { leadId: filters.leadId } : {}),
                ...(filters.clientId ? { clientId: filters.clientId } : {}),
            },
            orderBy: { lastMessageAt: 'desc' },
            take: 50,
            include: {
                lead: { select: { id: true, name: true, phone: true } },
                client: { select: { id: true, companyName: true, phone: true } },
            },
        });
        return conversations.map((conversation) => this.toConversationResponse(conversation));
    }
    async listMessages(user, conversationId) {
        const conversation = await this.prisma.whatsappConversation.findFirst({
            where: { id: conversationId, companyId: this.companyId(user) },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversa não encontrada.');
        }
        if (conversation.leadId) {
            await this.findLeadForUser(user, conversation.leadId);
        }
        const messages = await this.prisma.whatsappMessage.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: 'asc' },
            take: 200,
            include: {
                sentBy: { select: { id: true, name: true } },
            },
        });
        if (conversation.unreadCount > 0) {
            await this.prisma.whatsappConversation.update({
                where: { id: conversation.id },
                data: { unreadCount: 0 },
            });
        }
        return messages.map((message) => this.toMessageResponse(message));
    }
    async sendMessage(user, dto) {
        const credentials = await this.requireCredentials();
        const body = dto.body?.trim() ?? '';
        const templateName = dto.templateName?.trim() ?? '';
        if (!body && !templateName) {
            throw new common_1.BadRequestException('Informe o texto ou um template da Meta.');
        }
        const lead = dto.leadId
            ? await this.findLeadForUser(user, dto.leadId)
            : null;
        const waId = (0, whatsapp_phone_util_1.toWhatsappId)(dto.to || lead?.phone);
        if (!waId) {
            throw new common_1.BadRequestException('Telefone inválido. Use DDD brasileiro (10 ou 11 dígitos).');
        }
        const conversation = await this.upsertConversation({
            companyId: credentials.companyId,
            waId,
            phone: lead?.phone ?? dto.to ?? waId,
            leadId: lead?.id ?? dto.leadId ?? null,
            clientId: dto.clientId ?? lead?.organizationId ?? null,
        });
        const type = templateName ? 'TEMPLATE' : 'TEXT';
        const preview = (0, whatsapp_phone_util_1.previewText)(body || (templateName ? `Template: ${templateName}` : null));
        const pending = await this.prisma.whatsappMessage.create({
            data: {
                conversationId: conversation.id,
                companyId: credentials.companyId,
                direction: 'OUTBOUND',
                type,
                body: body || null,
                templateName: templateName || null,
                status: 'PENDING',
                sentByUserId: user.userId,
            },
            include: { sentBy: { select: { id: true, name: true } } },
        });
        try {
            const result = templateName
                ? await this.cloud.sendTemplate(credentials.accessToken, credentials.phoneNumberId, waId, templateName, dto.templateLanguage?.trim() || 'pt_BR', dto.templateParameters ?? [])
                : await this.cloud.sendText(credentials.accessToken, credentials.phoneNumberId, waId, body);
            const sent = await this.prisma.whatsappMessage.update({
                where: { id: pending.id },
                data: {
                    status: 'SENT',
                    waMessageId: result.waMessageId,
                },
                include: { sentBy: { select: { id: true, name: true } } },
            });
            await this.prisma.whatsappConversation.update({
                where: { id: conversation.id },
                data: {
                    lastMessageAt: sent.createdAt,
                    lastMessagePreview: preview,
                    waId: result.waId || conversation.waId,
                },
            });
            return this.toMessageResponse(sent);
        }
        catch (error) {
            const message = error instanceof whatsapp_cloud_client_1.WhatsappCloudApiError
                ? error.message
                : 'Falha ao enviar mensagem no WhatsApp.';
            await this.prisma.whatsappMessage.update({
                where: { id: pending.id },
                data: { status: 'FAILED', errorMessage: message },
            });
            throw new common_1.ServiceUnavailableException(message);
        }
    }
    async persistInbound(companyId, inbound) {
        const existing = await this.prisma.whatsappMessage.findUnique({
            where: { waMessageId: inbound.waMessageId },
        });
        if (existing)
            return;
        const lead = await this.findLeadByWaId(companyId, inbound.waId);
        const client = lead
            ? null
            : await this.findClientByWaId(companyId, inbound.waId);
        const conversation = await this.upsertConversation({
            companyId,
            waId: inbound.waId,
            phone: inbound.waId,
            leadId: lead?.id ?? null,
            clientId: client?.id ?? lead?.organizationId ?? null,
        });
        const parsed = inbound.timestamp ? Number(inbound.timestamp) : NaN;
        const createdAt = Number.isFinite(parsed)
            ? new Date(parsed * 1000)
            : new Date();
        await this.prisma.whatsappMessage.create({
            data: {
                conversationId: conversation.id,
                companyId,
                direction: 'INBOUND',
                type: inbound.type,
                body: inbound.body,
                waMessageId: inbound.waMessageId,
                status: 'DELIVERED',
                createdAt,
            },
        });
        await this.prisma.whatsappConversation.update({
            where: { id: conversation.id },
            data: {
                lastMessageAt: createdAt,
                lastMessagePreview: (0, whatsapp_phone_util_1.previewText)(inbound.body),
                unreadCount: { increment: 1 },
                leadId: conversation.leadId ?? lead?.id ?? undefined,
                clientId: conversation.clientId ?? client?.id ?? undefined,
            },
        });
    }
    async persistStatus(companyId, update) {
        const message = await this.prisma.whatsappMessage.findFirst({
            where: { companyId, waMessageId: update.waMessageId },
        });
        if (!message)
            return;
        await this.prisma.whatsappMessage.update({
            where: { id: message.id },
            data: {
                status: update.status,
                errorMessage: update.errorMessage,
            },
        });
    }
    async upsertConversation(input) {
        const existing = await this.prisma.whatsappConversation.findUnique({
            where: {
                companyId_waId: { companyId: input.companyId, waId: input.waId },
            },
        });
        if (existing) {
            if ((input.leadId && !existing.leadId) ||
                (input.clientId && !existing.clientId)) {
                return this.prisma.whatsappConversation.update({
                    where: { id: existing.id },
                    data: {
                        leadId: existing.leadId ?? input.leadId,
                        clientId: existing.clientId ?? input.clientId,
                        phone: existing.phone ?? input.phone,
                    },
                });
            }
            return existing;
        }
        return this.prisma.whatsappConversation.create({
            data: {
                companyId: input.companyId,
                waId: input.waId,
                phone: input.phone,
                leadId: input.leadId,
                clientId: input.clientId,
            },
        });
    }
    async findLeadByWaId(companyId, waId) {
        const needle = (0, whatsapp_phone_util_1.lastPhoneDigits)(waId);
        if (needle.length < 8)
            return null;
        return this.prisma.lead.findFirst({
            where: {
                companyId,
                deletedAt: null,
                phone: { contains: needle },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async findClientByWaId(companyId, waId) {
        const needle = (0, whatsapp_phone_util_1.lastPhoneDigits)(waId);
        if (needle.length < 8)
            return null;
        return this.prisma.client.findFirst({
            where: {
                companyId,
                phone: { contains: needle },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async findLeadForUser(user, id) {
        const orgFilter = await this.crmScope.buildLeadOrganizationFilter(user);
        const lead = await this.prisma.lead.findFirst({
            where: { id, deletedAt: null, ...orgFilter },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead não encontrado.');
        }
        await this.crmScope.assertLeadAccess(user, lead);
        return lead;
    }
    async requireCredentials() {
        const credentials = await this.companySettings.getWhatsappCredentialsForCurrentTenant();
        if (!this.isConfigured(credentials)) {
            throw new common_1.ServiceUnavailableException('WhatsApp não configurado. Preencha token e Phone Number ID em Integrações APIs.');
        }
        return credentials;
    }
    isConfigured(credentials) {
        return Boolean(credentials.accessToken && credentials.phoneNumberId);
    }
    companyId(user) {
        return user.companyId ?? company_constants_1.DEFAULT_COMPANY_ID;
    }
    buildWebhookUrl() {
        const base = this.config.get('APP_URL')?.trim().replace(/\/$/, '') ||
            this.config
                .get('TWILIO_WEBHOOK_BASE_URL')
                ?.trim()
                .replace(/\/$/, '') ||
            '';
        return base ? `${base}/whatsapp/webhook` : '/whatsapp/webhook';
    }
    hubQueryValue(query, key) {
        const dotted = query[`hub.${key}`];
        if (typeof dotted === 'string' && dotted.trim())
            return dotted;
        const hub = query.hub;
        if (hub && typeof hub === 'object' && !Array.isArray(hub)) {
            const value = hub[key];
            if (typeof value === 'string' && value.trim())
                return value;
        }
        return undefined;
    }
    header(headers, name) {
        const value = headers[name] ?? headers[name.toLowerCase()];
        return Array.isArray(value) ? value[0] : value;
    }
    toConversationResponse(conversation) {
        return {
            id: conversation.id,
            waId: conversation.waId,
            phone: conversation.phone,
            leadId: conversation.leadId,
            clientId: conversation.clientId,
            lastMessageAt: conversation.lastMessageAt.toISOString(),
            lastMessagePreview: conversation.lastMessagePreview,
            unreadCount: conversation.unreadCount,
            lead: conversation.lead,
            client: conversation.client
                ? {
                    id: conversation.client.id,
                    name: conversation.client.companyName,
                    phone: conversation.client.phone,
                }
                : null,
        };
    }
    toMessageResponse(message) {
        return {
            id: message.id,
            conversationId: message.conversationId,
            direction: message.direction,
            type: message.type,
            body: message.body,
            templateName: message.templateName,
            waMessageId: message.waMessageId,
            status: message.status,
            errorMessage: message.errorMessage,
            createdAt: message.createdAt.toISOString(),
            sentBy: message.sentBy,
        };
    }
};
exports.WhatsappService = WhatsappService;
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        company_settings_service_1.CompanySettingsService,
        crm_scope_service_1.CrmScopeService])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map