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
        if (filter.status) {
            where.status = filter.status;
        }
        if (filter.assignee === 'mine' && filter.userId) {
            where.assignedUserId = filter.userId;
        }
        if (filter.assignee === 'unassigned') {
            where.assignedUserId = null;
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
            orderBy: { lastMessageAt: 'desc' },
        });
        return rows.map((row) => this.toConversation(row));
    }
    async getConversation(phone) {
        const row = await this.prisma.whatsAppConversation.findUnique({
            where: { phone },
            include: { assignedUser: { select: assignedUserSelect } },
        });
        return row ? this.toConversation(row) : null;
    }
    async upsertConversation(input) {
        const row = await this.prisma.whatsAppConversation.upsert({
            where: { phone: input.phone },
            create: {
                phone: input.phone,
                name: input.name?.trim() || null,
                lastMessageAt: new Date(),
                lastMessagePreview: input.preview.slice(0, 180),
                unreadCount: input.inbound ? 1 : 0,
                status: client_1.WhatsAppConversationStatus.OPEN,
            },
            update: {
                lastMessageAt: new Date(),
                lastMessagePreview: input.preview.slice(0, 180),
                ...(input.name?.trim() ? { name: input.name.trim() } : {}),
                ...(input.inbound ? { unreadCount: { increment: 1 } } : {}),
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
                    ? { assignedUserId: patch.assignedUserId }
                    : {}),
                ...(patch.labels ? { labels: patch.labels } : {}),
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
        return this.prisma.whatsAppCannedResponse.findMany({
            orderBy: { shortCode: 'asc' },
        });
    }
    async createCannedResponse(input) {
        return this.prisma.whatsAppCannedResponse.create({
            data: {
                shortCode: input.shortCode.replace(/^\//, '').trim().toLowerCase(),
                title: input.title.trim(),
                content: input.content.trim(),
            },
        });
    }
    async deleteCannedResponse(id) {
        await this.prisma.whatsAppCannedResponse.delete({ where: { id } });
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
    toMessage(row) {
        return {
            id: row.id,
            whatsappMessageId: row.whatsappMessageId,
            fromPhone: row.fromPhone,
            toPhone: row.toPhone,
            body: row.body,
            direction: row.direction,
            status: row.status,
            isPrivate: row.isPrivate,
            sentByUserId: row.sentByUserId,
            sentByName: row.sentBy?.name ?? null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
    toConversation(row) {
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
        };
    }
};
exports.PrismaWhatsAppMessageRepository = PrismaWhatsAppMessageRepository;
exports.PrismaWhatsAppMessageRepository = PrismaWhatsAppMessageRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaWhatsAppMessageRepository);
//# sourceMappingURL=prisma-whatsapp-message.repository.js.map