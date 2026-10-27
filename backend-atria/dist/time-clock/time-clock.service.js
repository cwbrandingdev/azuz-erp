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
exports.TimeClockService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const time_clock_dates_1 = require("./time-clock-dates");
const work_hours_calculator_1 = require("./work-hours.calculator");
const MIN_MS_BETWEEN_PUNCHES = 60_000;
const MAX_RANGE_DAYS = 93;
const ENTRY_SELECT = {
    id: true,
    userId: true,
    type: true,
    punchedAt: true,
    isManual: true,
    note: true,
    createdAt: true,
    updatedAt: true,
    createdBy: { select: { id: true, name: true } },
    updatedBy: { select: { id: true, name: true } },
};
let TimeClockService = class TimeClockService {
    prisma;
    calculator;
    constructor(prisma, calculator) {
        this.prisma = prisma;
        this.calculator = calculator;
    }
    async punch(user, type, context) {
        const companyId = this.requireMemberCompany(user);
        const todayEntries = await this.findEntries(companyId, {
            userId: user.userId,
            range: this.singleDayRange(new Date()),
        });
        if (!this.calculator.allowedTypes(todayEntries).includes(type)) {
            throw new common_1.BadRequestException(`${type} punch is not allowed right now`);
        }
        const lastEntry = todayEntries.at(-1);
        if (lastEntry &&
            Date.now() - lastEntry.punchedAt.getTime() < MIN_MS_BETWEEN_PUNCHES) {
            throw new common_1.BadRequestException('Wait at least one minute between punches');
        }
        return this.prisma.timeClockEntry.create({
            data: {
                companyId,
                userId: user.userId,
                type,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
            },
            select: ENTRY_SELECT,
        });
    }
    async getMine(user, query) {
        const companyId = this.requireMemberCompany(user);
        const range = this.resolveRange(query);
        const [entries, todayEntries] = await Promise.all([
            this.findEntries(companyId, { userId: user.userId, range }),
            this.findEntries(companyId, {
                userId: user.userId,
                range: this.singleDayRange(new Date()),
            }),
        ]);
        const days = this.calculator.summarizeByDay(entries);
        return {
            range,
            allowedTypes: this.calculator.allowedTypes(todayEntries),
            totalMinutes: this.calculator.totalMinutes(days),
            days,
        };
    }
    async list(user, query) {
        const companyId = this.requireCompany(user);
        const range = this.resolveRange(query);
        const [members, entries] = await Promise.all([
            this.prisma.user.findMany({
                where: {
                    companyId,
                    category: client_1.UserCategory.MEMBER,
                    isActive: true,
                    ...(query.userId ? { id: query.userId } : {}),
                },
                select: { id: true, name: true, avatarUrl: true },
                orderBy: { name: 'asc' },
            }),
            this.findEntries(companyId, { userId: query.userId, range }),
        ]);
        const today = (0, time_clock_dates_1.toSaoPauloDayKey)(new Date());
        const entriesByUser = this.groupByUser(entries);
        const users = members.map((member) => {
            const days = this.calculator.summarizeByDay(entriesByUser.get(member.id) ?? []);
            return {
                user: member,
                totalMinutes: this.calculator.totalMinutes(days),
                status: this.currentStatus(days, today),
                days,
            };
        });
        return { range, users };
    }
    async createManual(admin, dto) {
        const companyId = this.requireCompany(admin);
        await this.assertMemberOfCompany(dto.userId, companyId);
        return this.prisma.timeClockEntry.create({
            data: {
                companyId,
                userId: dto.userId,
                type: dto.type,
                punchedAt: this.parsePastDate(dto.punchedAt),
                isManual: true,
                note: dto.note.trim(),
                createdById: admin.userId,
            },
            select: ENTRY_SELECT,
        });
    }
    async update(admin, entryId, dto) {
        const companyId = this.requireCompany(admin);
        const existing = await this.prisma.timeClockEntry.findFirst({
            where: { id: entryId, companyId },
            select: { id: true },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Time clock entry not found');
        }
        return this.prisma.timeClockEntry.update({
            where: { id: entryId },
            data: {
                ...(dto.type ? { type: dto.type } : {}),
                ...(dto.punchedAt
                    ? { punchedAt: this.parsePastDate(dto.punchedAt) }
                    : {}),
                note: dto.note.trim(),
                updatedById: admin.userId,
            },
            select: ENTRY_SELECT,
        });
    }
    findEntries(companyId, filter) {
        return this.prisma.timeClockEntry.findMany({
            where: {
                companyId,
                ...(filter.userId ? { userId: filter.userId } : {}),
                punchedAt: {
                    gte: (0, time_clock_dates_1.startOfSaoPauloDay)(filter.range.from),
                    lt: (0, time_clock_dates_1.endOfSaoPauloDayExclusive)(filter.range.to),
                },
            },
            select: ENTRY_SELECT,
            orderBy: { punchedAt: 'asc' },
        });
    }
    currentStatus(days, today) {
        const lastType = days
            .find((day) => day.date === today)
            ?.entries.at(-1)?.type;
        if (lastType === client_1.TimeClockEntryType.BREAK_START)
            return 'ON_BREAK';
        if (lastType === client_1.TimeClockEntryType.IN)
            return 'WORKING';
        if (lastType === client_1.TimeClockEntryType.BREAK_END)
            return 'WORKING';
        return 'OFF';
    }
    groupByUser(entries) {
        const grouped = new Map();
        for (const entry of entries) {
            const userEntries = grouped.get(entry.userId) ?? [];
            userEntries.push(entry);
            grouped.set(entry.userId, userEntries);
        }
        return grouped;
    }
    resolveRange(query) {
        const defaults = (0, time_clock_dates_1.currentMonthRange)();
        const range = {
            from: query.from ?? defaults.from,
            to: query.to ?? defaults.to,
        };
        const span = (0, time_clock_dates_1.daysBetween)(range.from, range.to);
        if (span < 0) {
            throw new common_1.BadRequestException('from must be before to');
        }
        if (span > MAX_RANGE_DAYS) {
            throw new common_1.BadRequestException(`Range cannot exceed ${MAX_RANGE_DAYS} days`);
        }
        return range;
    }
    singleDayRange(date) {
        const day = (0, time_clock_dates_1.toSaoPauloDayKey)(date);
        return { from: day, to: day };
    }
    parsePastDate(value) {
        const date = new Date(value);
        if (date.getTime() > Date.now()) {
            throw new common_1.BadRequestException('Punch time cannot be in the future');
        }
        return date;
    }
    async assertMemberOfCompany(userId, companyId) {
        const member = await this.prisma.user.findFirst({
            where: { id: userId, companyId, category: client_1.UserCategory.MEMBER },
            select: { id: true },
        });
        if (!member) {
            throw new common_1.NotFoundException('User not found');
        }
    }
    requireMemberCompany(user) {
        if (user.category !== client_1.UserCategory.MEMBER) {
            throw new common_1.ForbiddenException('Only team members can punch the clock');
        }
        return this.requireCompany(user);
    }
    requireCompany(user) {
        if (!user.companyId) {
            throw new common_1.ForbiddenException('User is not linked to a company');
        }
        return user.companyId;
    }
};
exports.TimeClockService = TimeClockService;
exports.TimeClockService = TimeClockService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        work_hours_calculator_1.WorkHoursCalculator])
], TimeClockService);
//# sourceMappingURL=time-clock.service.js.map