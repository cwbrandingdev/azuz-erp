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
exports.PrismaWhatsAppMessageRepository = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const whatsapp_message_1 = require("../domain/whatsapp-message");
const whatsapp_message_repository_1 = require("../domain/whatsapp-message.repository");
const assignedUserSelect = {
    id: true,
    name: true,
    avatarUrl: true,
};
let PrismaWhatsAppMessageRepository = class PrismaWhatsAppMessageRepository extends whatsapp_message_repository_1.WhatsAppMessageRepository {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async create(data) {
        const row = await this.prisma.whatsAppMessage.create({
            data: {
                whatsappMessageId: data.whatsappMessageId,
                fromPhone: data.fromPhone,
                toPhone: data.toPhone,
                body: data.body,
                kind: (data.kind ?? whatsapp_message_1.WhatsAppMessageKind.TEXT),
                mediaUrl: data.mediaUrl ?? null,
                mediaMimeType: data.mediaMimeType ?? null,
                mediaFilename: data.mediaFilename ?? null,
                latitude: data.latitude ?? null,
                longitude: data.longitude ?? null,
                locationName: data.locationName ?? null,
                locationAddress: data.locationAddress ?? null,
                isViewOnce: data.isViewOnce ?? false,
                isVoiceNote: data.isVoiceNote ?? false,
                transcription: data.transcription ?? null,
                templateName: data.templateName ?? null,
                templateLanguage: data.templateLanguage ?? null,
                direction: data.direction,
                status: data.status,
                isPrivate: data.isPrivate,
                sentByUserId: data.sentByUserId,
                conversationId: data.conversationId,
            },
            include: {
                sentBy: { select: { name: true } },
            },
        });
        return this.toMessage(row);
    }
    async findByWhatsappMessageId(whatsappMessageId) {
        const row = await this.prisma.whatsAppMessage.findUnique({
            where: { whatsappMessageId },
            include: { sentBy: { select: { name: true } } },
        });
        return row ? this.toMessage(row) : null;
    }
    async findConversation(phone) {
        const rows = await this.prisma.whatsAppMessage.findMany({
            where: {
                OR: [{ fromPhone: phone }, { toPhone: phone }],
            },
            include: { sentBy: { select: { name: true } } },
            orderBy: { createdAt: 'asc' },
        });
        return rows.map((row) => this.toMessage(row));
    }
    async listConversations(filter) {
        await this.backfillConversations();
        const where = {};
        const tab = filter.tab;
        if (tab === 'OPEN') {
            where.status = client_1.WhatsAppConversationStatus.OPEN;
        }
        else if (tab === 'WAITING') {
            where.status = client_1.WhatsAppConversationStatus.PENDING;
        }
        else if (tab === 'CLOSED') {
            where.status = client_1.WhatsAppConversationStatus.RESOLVED;
        }
        else if (tab === 'MINE' && filter.userId) {
            where.assignedUserId = filter.userId;
            where.status = { not: client_1.WhatsAppConversationStatus.RESOLVED };
        }
        else if (tab === 'UNASSIGNED') {
            where.assignedUserId = null;
            where.status = { not: client_1.WhatsAppConversationStatus.RESOLVED };
        }
        else if (filter.status) {
            where.status = filter.status;
        }
        if (!tab) {
            if (filter.assignee === 'mine' && filter.userId) {
                where.assignedUserId = filter.userId;
            }
            if (filter.assignee === 'unassigned') {
                where.assignedUserId = null;
            }
        }
        if (filter.operatorId) {
            where.assignedUserId = filter.operatorId;
        }
        if (filter.label?.trim()) {
            where.labels = { has: filter.label.trim() };
        }
        if (filter.query?.trim()) {
            const q = filter.query.trim();
            where.OR = [
                { phone: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
                { lastMessagePreview: { contains: q, mode: 'insensitive' } },
            ];
        }
        const rows = await this.prisma.whatsAppConversation.findMany({
            where,
            include: { assignedUser: { select: assignedUserSelect } },
            orderBy: tab === 'UNASSIGNED'
                ? [
                    { queuedAt: { sort: 'asc', nulls: 'last' } },
                    { lastMessageAt: 'desc' },
                ]
                : { lastMessageAt: 'desc' },
        });
        return rows.map((row) => this.toConversation(row, filter.slaMinutes ?? 5));
    }
    async getConversation(phone) {
        const row = await this.prisma.whatsAppConversation.findUnique({
            where: { phone },
            include: { assignedUser: { select: assignedUserSelect } },
        });
        return row ? this.toConversation(row) : null;
    }
    async upsertConversation(input) {
        const now = new Date();
        const existing = await this.prisma.whatsAppConversation.findUnique({
            where: { phone: input.phone },
        });
        const queuedAt = existing?.queuedAt ?? null;
        const lastAgentReplyAt = existing?.lastAgentReplyAt ?? null;
        const stillWaiting = Boolean(queuedAt && (!lastAgentReplyAt || lastAgentReplyAt < queuedAt));
        const row = await this.prisma.whatsAppConversation.upsert({
            where: { phone: input.phone },
            create: {
                phone: input.phone,
                name: input.name?.trim() || null,
                lastMessageAt: now,
                lastMessagePreview: input.preview.slice(0, 180),
                unreadCount: input.inbound ? 1 : 0,
                status: input.agentReply
                    ? client_1.WhatsAppConversationStatus.PENDING
                    : client_1.WhatsAppConversationStatus.OPEN,
                queuedAt: input.inbound ? now : null,
                lastCustomerMessageAt: input.inbound ? now : null,
                lastAgentReplyAt: input.agentReply ? now : null,
            },
            update: {
                lastMessageAt: now,
                lastMessagePreview: input.preview.slice(0, 180),
                ...(input.name?.trim() ? { name: input.name.trim() } : {}),
                ...(input.inbound
                    ? {
                        unreadCount: { increment: 1 },
                        lastCustomerMessageAt: now,
                        queuedAt: stillWaiting ? queuedAt : now,
                    }
                    : {}),
                ...(input.agentReply
                    ? {
                        lastAgentReplyAt: now,
                        queuedAt: null,
                        status: existing?.status === client_1.WhatsAppConversationStatus.RESOLVED ||
                            existing?.status === client_1.WhatsAppConversationStatus.SNOOZED
                            ? existing.status
                            : client_1.WhatsAppConversationStatus.PENDING,
                    }
                    : {}),
                ...(input.reopen ? { status: client_1.WhatsAppConversationStatus.OPEN } : {}),
            },
            include: { assignedUser: { select: assignedUserSelect } },
        });
        return this.toConversation(row);
    }
    async updateConversation(phone, patch) {
        const existing = await this.prisma.whatsAppConversation.findUnique({
            where: { phone },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Conversation not found');
        }
        const row = await this.prisma.whatsAppConversation.update({
            where: { phone },
            data: {
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.status
                    ? { status: patch.status }
                    : {}),
                ...(patch.priority
                    ? { priority: patch.priority }
                    : {}),
                ...(patch.assignedUserId !== undefined
                    ? {
                        assignedUserId: patch.assignedUserId,
                        assignedAt: patch.assignedUserId ? new Date() : null,
                    }
                    : {}),
                ...(patch.labels ? { labels: patch.labels } : {}),
                ...(patch.queuedAt !== undefined ? { queuedAt: patch.queuedAt } : {}),
                ...(patch.assignedAt !== undefined
                    ? { assignedAt: patch.assignedAt }
                    : {}),
                ...(patch.lastAgentReplyAt !== undefined
                    ? { lastAgentReplyAt: patch.lastAgentReplyAt }
                    : {}),
                ...(patch.lastCustomerMessageAt !== undefined
                    ? { lastCustomerMessageAt: patch.lastCustomerMessageAt }
                    : {}),
            },
            include: { assignedUser: { select: assignedUserSelect } },
        });
        return this.toConversation(row);
    }
    async markConversationRead(phone) {
        await this.prisma.whatsAppConversation.updateMany({
            where: { phone },
            data: { unreadCount: 0 },
        });
    }
    async updateStatusByWhatsappMessageId(whatsappMessageId, status) {
        await this.prisma.whatsAppMessage.updateMany({
            where: { whatsappMessageId },
            data: { status: status },
        });
    }
    async listCannedResponses() {
        const rows = await this.prisma.whatsAppCannedResponse.findMany({
            orderBy: { shortCode: 'asc' },
        });
        return rows.map((row) => this.toCanned(row));
    }
    async createCannedResponse(input) {
        const row = await this.prisma.whatsAppCannedResponse.create({
            data: {
                shortCode: input.shortCode.replace(/^\//, '').trim().toLowerCase(),
                title: input.title.trim(),
                content: input.content.trim() || (input.mediaUrl ? '[Mídia]' : ''),
                kind: (input.kind ?? whatsapp_message_1.WhatsAppMessageKind.TEXT),
                mediaUrl: input.mediaUrl ?? null,
                mediaMimeType: input.mediaMimeType ?? null,
                mediaFilename: input.mediaFilename ?? null,
            },
        });
        return this.toCanned(row);
    }
    async deleteCannedResponse(id) {
        await this.prisma.whatsAppCannedResponse.delete({ where: { id } });
    }
    async updateMessage(id, patch) {
        await this.prisma.whatsAppMessage.update({
            where: { id },
            data: {
                ...(patch.transcription !== undefined
                    ? { transcription: patch.transcription }
                    : {}),
                ...(patch.mediaUrl !== undefined ? { mediaUrl: patch.mediaUrl } : {}),
                ...(patch.mediaMimeType !== undefined
                    ? { mediaMimeType: patch.mediaMimeType }
                    : {}),
            },
        });
    }
    async backfillConversations() {
        const messages = await this.prisma.whatsAppMessage.findMany({
            where: { isPrivate: false },
            orderBy: { createdAt: 'desc' },
        });
        const seen = new Set();
        for (const row of messages) {
            const phone = row.direction === client_1.WhatsAppMessageDirection.OUTBOUND
                ? row.toPhone
                : row.fromPhone;
            if (seen.has(phone))
                continue;
            seen.add(phone);
            await this.prisma.whatsAppConversation.upsert({
                where: { phone },
                create: {
                    phone,
                    lastMessageAt: row.createdAt,
                    lastMessagePreview: row.body.slice(0, 180),
                },
                update: {},
            });
        }
    }
    toCanned(row) {
        return {
            id: row.id,
            shortCode: row.shortCode,
            title: row.title,
            content: row.content,
            kind: row.kind,
            mediaUrl: row.mediaUrl,
            mediaMimeType: row.mediaMimeType,
            mediaFilename: row.mediaFilename,
        };
    }
    toMessage(row) {
        return {
            id: row.id,
            whatsappMessageId: row.whatsappMessageId,
            fromPhone: row.fromPhone,
            toPhone: row.toPhone,
            body: row.body,
            kind: (row.kind ?? 'TEXT'),
            mediaUrl: row.mediaUrl ?? null,
            mediaMimeType: row.mediaMimeType ?? null,
            mediaFilename: row.mediaFilename ?? null,
            latitude: row.latitude ?? null,
            longitude: row.longitude ?? null,
            locationName: row.locationName ?? null,
            locationAddress: row.locationAddress ?? null,
            isViewOnce: row.isViewOnce ?? false,
            isVoiceNote: row.isVoiceNote ?? false,
            transcription: row.transcription ?? null,
            templateName: row.templateName ?? null,
            templateLanguage: row.templateLanguage ?? null,
            direction: row.direction,
            status: row.status,
            isPrivate: row.isPrivate,
            sentByUserId: row.sentByUserId,
            sentByName: row.sentBy?.name ?? null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
    toConversation(row, slaMinutes = 5) {
        const queuedAt = row.queuedAt ?? null;
        const assignedAt = row.assignedAt ?? null;
        const lastAgentReplyAt = row.lastAgentReplyAt ?? null;
        const needsAgentReply = Boolean(queuedAt && (!lastAgentReplyAt || lastAgentReplyAt < queuedAt));
        const waitFrom = assignedAt && row.assignedUser ? assignedAt : queuedAt;
        const waitingSeconds = needsAgentReply && waitFrom
            ? Math.max(0, Math.round((Date.now() - waitFrom.getTime()) / 1000))
            : 0;
        return {
            id: row.id,
            phone: row.phone,
            name: row.name,
            status: row.status,
            priority: row.priority,
            labels: row.labels,
            unreadCount: row.unreadCount,
            lastMessage: row.lastMessagePreview,
            lastMessageAt: row.lastMessageAt,
            direction: null,
            assignedUser: row.assignedUser,
            queuedAt,
            assignedAt,
            lastAgentReplyAt,
            waitingSeconds,
            slaBreached: waitingSeconds > slaMinutes * 60,
            needsAgentReply,
            lead: null,
        };
    }
};
exports.PrismaWhatsAppMessageRepository = PrismaWhatsAppMessageRepository;
exports.PrismaWhatsAppMessageRepository = PrismaWhatsAppMessageRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaWhatsAppMessageRepository);
//# sourceMappingURL=prisma-whatsapp-message.repository.js.map