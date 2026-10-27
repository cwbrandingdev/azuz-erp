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
var TimeClockRemindersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeClockRemindersService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const notifications_service_1 = require("../notifications/notifications.service");
const prisma_service_1 = require("../prisma/prisma.service");
const time_clock_dates_1 = require("./time-clock-dates");
const LUNCH_DURATION_MS = 60 * 60 * 1000;
const ACTIVE_USER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const REMINDERS = {
    CLOCK_IN: {
        title: 'Registre sua entrada',
        message: 'Você ainda não bateu o ponto de entrada hoje.',
    },
    LUNCH_RETURN: {
        title: 'Registre a volta do almoço',
        message: 'Seu almoço já passou de 1 hora. Não esqueça de bater o ponto.',
    },
    CLOCK_OUT: {
        title: 'Registre sua saída',
        message: 'Não esqueça de bater o ponto de saída antes de encerrar o dia.',
    },
};
let TimeClockRemindersService = TimeClockRemindersService_1 = class TimeClockRemindersService {
    prisma;
    notifications;
    logger = new common_1.Logger(TimeClockRemindersService_1.name);
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async remindClockIn() {
        await this.remind('CLOCK_IN', (lastPunch) => !lastPunch);
    }
    async remindLunchReturn() {
        const now = Date.now();
        await this.remind('LUNCH_RETURN', (lastPunch) => lastPunch?.type === client_1.TimeClockEntryType.BREAK_START &&
            now - lastPunch.punchedAt.getTime() >= LUNCH_DURATION_MS);
    }
    async remindClockOut() {
        await this.remind('CLOCK_OUT', (lastPunch) => lastPunch?.type === client_1.TimeClockEntryType.IN ||
            lastPunch?.type === client_1.TimeClockEntryType.BREAK_END);
    }
    async remind(kind, needsReminder) {
        const activeUsers = await this.findActiveUsers();
        if (activeUsers.length === 0)
            return;
        const lastPunches = await this.findTodayLastPunches(activeUsers.map((user) => user.userId));
        const candidates = activeUsers.filter((user) => needsReminder(lastPunches.get(user.userId)));
        const recipients = await this.excludeAlreadyReminded(kind, candidates);
        if (recipients.length === 0)
            return;
        await this.send(kind, recipients);
        this.logger.log(`Sent ${kind} reminder to ${recipients.length} user(s)`);
    }
    async findActiveUsers() {
        const recentPunches = await this.prisma.timeClockEntry.findMany({
            where: {
                punchedAt: { gte: new Date(Date.now() - ACTIVE_USER_WINDOW_MS) },
                user: { isActive: true, category: client_1.UserCategory.MEMBER },
            },
            distinct: ['userId'],
            select: { userId: true, companyId: true },
        });
        return recentPunches;
    }
    async findTodayLastPunches(userIds) {
        const today = (0, time_clock_dates_1.toSaoPauloDayKey)(new Date());
        const punches = await this.prisma.timeClockEntry.findMany({
            where: {
                userId: { in: userIds },
                punchedAt: {
                    gte: (0, time_clock_dates_1.startOfSaoPauloDay)(today),
                    lt: (0, time_clock_dates_1.endOfSaoPauloDayExclusive)(today),
                },
            },
            select: { userId: true, type: true, punchedAt: true },
            orderBy: { punchedAt: 'asc' },
        });
        return new Map(punches.map((punch) => [punch.userId, punch]));
    }
    async excludeAlreadyReminded(kind, users) {
        if (users.length === 0)
            return [];
        const today = (0, time_clock_dates_1.toSaoPauloDayKey)(new Date());
        const alreadyReminded = await this.prisma.notification.findMany({
            where: {
                type: client_1.NotificationType.TIME_CLOCK_REMINDER,
                title: REMINDERS[kind].title,
                userId: { in: users.map((user) => user.userId) },
                createdAt: { gte: (0, time_clock_dates_1.startOfSaoPauloDay)(today) },
            },
            select: { userId: true },
        });
        const remindedIds = new Set(alreadyReminded.map((row) => row.userId));
        return users.filter((user) => !remindedIds.has(user.userId));
    }
    async send(kind, recipients) {
        const { title, message } = REMINDERS[kind];
        const userIdsByCompany = new Map();
        for (const { userId, companyId } of recipients) {
            const userIds = userIdsByCompany.get(companyId) ?? [];
            userIds.push(userId);
            userIdsByCompany.set(companyId, userIds);
        }
        for (const [companyId, userIds] of userIdsByCompany) {
            await this.notifications.createMany(userIds, client_1.NotificationType.TIME_CLOCK_REMINDER, title, message, { companyId });
        }
    }
};
exports.TimeClockRemindersService = TimeClockRemindersService;
__decorate([
    (0, schedule_1.Cron)('0 9 * * 1-5', { timeZone: time_clock_dates_1.SAO_PAULO_TZ }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TimeClockRemindersService.prototype, "remindClockIn", null);
__decorate([
    (0, schedule_1.Cron)('*/5 10-17 * * 1-5', { timeZone: time_clock_dates_1.SAO_PAULO_TZ }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TimeClockRemindersService.prototype, "remindLunchReturn", null);
__decorate([
    (0, schedule_1.Cron)('0 18 * * 1-5', { timeZone: time_clock_dates_1.SAO_PAULO_TZ }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TimeClockRemindersService.prototype, "remindClockOut", null);
exports.TimeClockRemindersService = TimeClockRemindersService = TimeClockRemindersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], TimeClockRemindersService);
//# sourceMappingURL=time-clock-reminders.service.js.map