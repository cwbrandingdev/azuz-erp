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
const company_constants_1 = require("../company/company.constants");
const prisma_service_1 = require("../prisma/prisma.service");
let WhatsappWebhookService = class WhatsappWebhookService {
    configService;
    prisma;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
    }
    verifyWebhook(mode, token, challenge) {
        const verifyToken = this.configService.get('WEBHOOK_VERIFY_TOKEN');
        if (mode === 'subscribe' && token === verifyToken) {
            return challenge;
        }
        throw new common_1.UnauthorizedException('Verification failed');
    }
    async handleIncomingPayload(payload) {
        const entries = Array.isArray(payload?.entry) ? payload.entry : [];
        for (const entry of entries) {
            const changes = Array.isArray(entry?.changes) ? entry.changes : [];
            for (const change of changes) {
                const value = change?.value;
                if (!value)
                    continue;
                const contactName = value.contacts?.[0]?.profile?.name ?? null;
                for (const message of value.messages ?? []) {
                    await this.persistInbound(message, contactName);
                }
                for (const status of value.statuses ?? []) {
                    await this.persistStatus(status);
                }
            }
        }
    }
    async listConversations(companyId) {
        const rows = await this.prisma.whatsappConversation.findMany({
            where: { companyId },
            orderBy: { lastMessageAt: 'desc' },
        });
        return rows.map((row) => this.toConversation(row));
    }
    async createConversation(companyId, phone, name) {
        const waId = this.normalizeRecipient(phone);
        const conversation = await this.prisma.whatsappConversation.upsert({
            where: { companyId_waId: { companyId, waId } },
            create: {
                companyId,
                waId,
                phone: waId,
                name: name?.trim() || null,
            },
            update: {
                phone: waId,
                ...(name?.trim() ? { name: name.trim() } : {}),
            },
        });
        return this.toConversation(conversation);
    }
    async listMessages(companyId, conversationId) {
        const conversation = await this.prisma.whatsappConversation.findFirst({
            where: { id: conversationId, companyId },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        await this.prisma.whatsappConversation.update({
            where: { id: conversation.id },
            data: { unreadCount: 0 },
        });
        const rows = await this.prisma.whatsappMessage.findMany({
            where: { conversationId: conversation.id, companyId },
            orderBy: { createdAt: 'asc' },
            take: 200,
        });
        return rows.map((row) => this.toMessage(row));
    }
    async sendText(companyId, userId, to, body) {
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
        const waId = data?.contacts?.[0]?.wa_id ?? recipient;
        const waMessageId = data?.messages?.[0]?.id ?? null;
        const conversation = await this.upsertConversation({
            companyId,
            waId,
            phone: waId,
            preview: body,
            inbound: false,
        });
        const message = await this.prisma.whatsappMessage.create({
            data: {
                conversationId: conversation.id,
                companyId,
                direction: 'OUT',
                type: 'TEXT',
                body,
                waMessageId,
                status: 'SENT',
                sentByUserId: userId,
            },
        });
        return {
            conversation: this.toConversation(conversation),
            message: this.toMessage(message),
        };
    }
    async persistInbound(message, contactName) {
        const from = this.normalizeRecipient(String(message?.from ?? ''));
        if (!from)
            return;
        const waMessageId = typeof message?.id === 'string' && message.id.length > 0
            ? message.id
            : null;
        if (waMessageId) {
            const existing = await this.prisma.whatsappMessage.findUnique({
                where: { waMessageId },
            });
            if (existing)
                return;
        }
        const companyId = await this.resolveInboundCompanyId(from);
        const body = this.extractBody(message);
        const conversation = await this.upsertConversation({
            companyId,
            waId: from,
            phone: from,
            name: contactName,
            preview: body,
            inbound: true,
        });
        await this.prisma.whatsappMessage.create({
            data: {
                conversationId: conversation.id,
                companyId,
                direction: 'IN',
                type: String(message?.type ?? 'text').toUpperCase(),
                body,
                waMessageId,
                status: 'DELIVERED',
            },
        });
    }
    async persistStatus(status) {
        const waMessageId = typeof status?.id === 'string' ? status.id : undefined;
        if (!waMessageId)
            return;
        const mapped = this.mapStatus(status?.status);
        if (!mapped)
            return;
        await this.prisma.whatsappMessage.updateMany({
            where: { waMessageId },
            data: {
                status: mapped,
                ...(mapped === 'FAILED'
                    ? { errorMessage: status?.errors?.[0]?.title ?? 'Failed' }
                    : {}),
            },
        });
    }
    async resolveInboundCompanyId(waId) {
        const existing = await this.prisma.whatsappConversation.findFirst({
            where: { waId },
            select: { companyId: true },
        });
        return existing?.companyId ?? company_constants_1.DEFAULT_COMPANY_ID;
    }
    async upsertConversation(input) {
        return this.prisma.whatsappConversation.upsert({
            where: {
                companyId_waId: { companyId: input.companyId, waId: input.waId },
            },
            create: {
                companyId: input.companyId,
                waId: input.waId,
                phone: input.phone,
                name: input.name?.trim() || null,
                lastMessageAt: new Date(),
                lastMessagePreview: input.preview.slice(0, 180),
                unreadCount: input.inbound ? 1 : 0,
            },
            update: {
                phone: input.phone,
                lastMessageAt: new Date(),
                lastMessagePreview: input.preview.slice(0, 180),
                ...(input.name?.trim() ? { name: input.name.trim() } : {}),
                ...(input.inbound ? { unreadCount: { increment: 1 } } : {}),
            },
        });
    }
    extractBody(message) {
        if (message?.text?.body)
            return String(message.text.body);
        if (message?.image?.caption)
            return String(message.image.caption);
        if (message?.type === 'image')
            return '[Imagem]';
        if (message?.type === 'audio')
            return '[Áudio]';
        if (message?.type === 'video')
            return '[Vídeo]';
        if (message?.type === 'document')
            return '[Documento]';
        if (message?.type === 'sticker')
            return '[Figurinha]';
        return `[${message?.type ?? 'mensagem'}]`;
    }
    mapStatus(status) {
        if (status === 'sent')
            return 'SENT';
        if (status === 'delivered')
            return 'DELIVERED';
        if (status === 'read')
            return 'READ';
        if (status === 'failed')
            return 'FAILED';
        return null;
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
    toConversation(row) {
        return {
            id: row.id,
            waId: row.waId,
            phone: row.phone,
            name: row.name,
            lastMessageAt: row.lastMessageAt,
            lastMessagePreview: row.lastMessagePreview,
            unreadCount: row.unreadCount,
            createdAt: row.createdAt,
        };
    }
    toMessage(row) {
        return {
            id: row.id,
            conversationId: row.conversationId,
            direction: row.direction,
            type: row.type,
            body: row.body,
            waMessageId: row.waMessageId,
            status: row.status,
            createdAt: row.createdAt,
        };
    }
};
exports.WhatsappWebhookService = WhatsappWebhookService;
exports.WhatsappWebhookService = WhatsappWebhookService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], WhatsappWebhookService);
//# sourceMappingURL=whatsapp-webhook.service.js.map