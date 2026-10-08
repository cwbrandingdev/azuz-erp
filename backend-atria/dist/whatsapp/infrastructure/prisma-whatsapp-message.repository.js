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
            },
        });
        return this.toRecord(row);
    }
    async findByWhatsappMessageId(whatsappMessageId) {
        const row = await this.prisma.whatsAppMessage.findUnique({
            where: { whatsappMessageId },
        });
        return row ? this.toRecord(row) : null;
    }
    async findConversation(phone) {
        const rows = await this.prisma.whatsAppMessage.findMany({
            where: {
                OR: [{ fromPhone: phone }, { toPhone: phone }],
            },
            orderBy: { createdAt: 'asc' },
        });
        return rows.map((row) => this.toRecord(row));
    }
    async listConversations() {
        const rows = await this.prisma.whatsAppMessage.findMany({
            orderBy: { createdAt: 'desc' },
        });
        const seen = new Set();
        const conversations = [];
        for (const row of rows) {
            const phone = row.direction === client_1.WhatsAppMessageDirection.OUTBOUND
                ? row.toPhone
                : row.fromPhone;
            if (seen.has(phone))
                continue;
            seen.add(phone);
            conversations.push({
                phone,
                lastMessage: row.body,
                lastMessageAt: row.createdAt,
                direction: row.direction,
            });
        }
        return conversations;
    }
    async updateStatusByWhatsappMessageId(whatsappMessageId, status) {
        await this.prisma.whatsAppMessage.updateMany({
            where: { whatsappMessageId },
            data: { status: status },
        });
    }
    toRecord(row) {
        return {
            id: row.id,
            whatsappMessageId: row.whatsappMessageId,
            fromPhone: row.fromPhone,
            toPhone: row.toPhone,
            body: row.body,
            direction: row.direction,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        };
    }
};
exports.PrismaWhatsAppMessageRepository = PrismaWhatsAppMessageRepository;
exports.PrismaWhatsAppMessageRepository = PrismaWhatsAppMessageRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaWhatsAppMessageRepository);
//# sourceMappingURL=prisma-whatsapp-message.repository.js.map