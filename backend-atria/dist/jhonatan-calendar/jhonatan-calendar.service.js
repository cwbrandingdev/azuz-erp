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
exports.JhonatanCalendarService = void 0;
const common_1 = require("@nestjs/common");
const company_constants_1 = require("../company/company.constants");
const prisma_service_1 = require("../prisma/prisma.service");
const MEETING_DURATION_MS = 60 * 60 * 1000;
const appointmentSelect = {
    id: true,
    title: true,
    contactName: true,
    briefing: true,
    leadId: true,
    startAt: true,
    endAt: true,
    createdById: true,
    createdBy: { select: { name: true } },
    lead: { select: { name: true } },
};
function resolveCompanyId(user) {
    return user.companyId?.trim() || company_constants_1.DEFAULT_COMPANY_ID;
}
function toResponse(appointment) {
    return {
        id: appointment.id,
        title: appointment.title,
        contactName: appointment.contactName,
        briefing: appointment.briefing,
        leadId: appointment.leadId,
        leadName: appointment.lead?.name ?? null,
        startAt: appointment.startAt.toISOString(),
        endAt: appointment.endAt.toISOString(),
        createdById: appointment.createdById,
        createdByName: appointment.createdBy.name,
    };
}
let JhonatanCalendarService = class JhonatanCalendarService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(user, query) {
        const from = new Date(query.from);
        const to = new Date(query.to);
        if (Number.isNaN(from.getTime()) ||
            Number.isNaN(to.getTime()) ||
            from >= to) {
            throw new common_1.BadRequestException('Intervalo de datas inválido.');
        }
        const appointments = await this.prisma.jhonatanCalendar.findMany({
            where: {
                companyId: resolveCompanyId(user),
                startAt: { lt: to },
                endAt: { gt: from },
            },
            select: appointmentSelect,
            orderBy: { startAt: 'asc' },
        });
        return appointments.map(toResponse);
    }
    async create(user, dto) {
        const companyId = resolveCompanyId(user);
        const startAt = new Date(dto.startAt);
        if (Number.isNaN(startAt.getTime())) {
            throw new common_1.BadRequestException('Data da reunião inválida.');
        }
        const endAt = new Date(startAt.getTime() + MEETING_DURATION_MS);
        const title = dto.title.trim();
        if (!title) {
            throw new common_1.BadRequestException('Informe o título da reunião.');
        }
        const leadId = dto.leadId?.trim() || null;
        let contactName = dto.contactName?.trim() ?? '';
        if (leadId) {
            const lead = await this.prisma.lead.findFirst({
                where: { id: leadId, companyId, deletedAt: null },
                select: { contactName: true, name: true },
            });
            if (!lead) {
                throw new common_1.NotFoundException('Lead não encontrado.');
            }
            contactName = lead.contactName?.trim() || lead.name.trim();
        }
        if (!contactName) {
            throw new common_1.BadRequestException('Informe um lead ou o nome do contato.');
        }
        const briefing = dto.briefing?.trim() || null;
        const created = await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${companyId})::bigint)`;
            const conflict = await tx.jhonatanCalendar.findFirst({
                where: {
                    companyId,
                    startAt: { lt: endAt },
                    endAt: { gt: startAt },
                },
                select: { id: true },
            });
            if (conflict) {
                throw new common_1.ConflictException('Esse horário já está ocupado.');
            }
            return tx.jhonatanCalendar.create({
                data: {
                    companyId,
                    leadId,
                    title,
                    contactName,
                    briefing,
                    startAt,
                    endAt,
                    createdById: user.userId,
                },
                select: appointmentSelect,
            });
        });
        return toResponse(created);
    }
    async remove(user, id) {
        const companyId = resolveCompanyId(user);
        const existing = await this.prisma.jhonatanCalendar.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Reunião não encontrada.');
        }
        await this.prisma.jhonatanCalendar.delete({ where: { id } });
    }
};
exports.JhonatanCalendarService = JhonatanCalendarService;
exports.JhonatanCalendarService = JhonatanCalendarService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JhonatanCalendarService);
//# sourceMappingURL=jhonatan-calendar.service.js.map