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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const calendar_service_1 = require("../calendar/calendar.service");
const finance_service_1 = require("../finance/finance.service");
const meta_insights_service_1 = require("../meta-insights/meta-insights.service");
const prisma_service_1 = require("../prisma/prisma.service");
const rbac_1 = require("../auth/utils/rbac");
const dashboard_tv_constants_1 = require("./dashboard-tv.constants");
const EMPTY_DASHBOARD_FINANCE = {
    revenue: 0,
    expenses: 0,
    netProfit: 0,
    monthlyTrend: [],
};
let DashboardService = class DashboardService {
    prisma;
    financeService;
    calendarService;
    metaInsightsService;
    constructor(prisma, financeService, calendarService, metaInsightsService) {
        this.prisma = prisma;
        this.financeService = financeService;
        this.calendarService = calendarService;
        this.metaInsightsService = metaInsightsService;
    }
    async getOverview(userId, role) {
        const now = new Date();
        const { year, month } = this.getCurrentMonthBounds(now);
        const currentMonthKey = `${year}-${String(month).padStart(2, '0')}`;
        const includeFinance = (0, rbac_1.canViewDashboardFinance)(role);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });
        const [cashFlow, campaigns, scheduledPosts, todayEvents, myTasks, pendingEvents] = await Promise.all([
            includeFinance
                ? this.financeService.getCashFlow(userId, { year, month })
                : Promise.resolve(null),
            Promise.resolve(this.metaInsightsService.getCampaigns()),
            this.prisma.contentPost.findMany({
                where: {
                    status: client_1.ContentPostStatus.SCHEDULED,
                    scheduledDate: { gte: new Date() },
                },
                orderBy: { scheduledDate: 'asc' },
                take: 3,
                select: {
                    id: true,
                    title: true,
                    platform: true,
                    scheduledDate: true,
                },
            }),
            this.getTodayEvents(),
            this.getMyKanbanTasks(userId),
            this.prisma.calendarEvent.count({
                where: { isPending: true },
            }),
        ]);
        const activeCampaigns = campaigns.filter((c) => c.status === 'active');
        const topCampaign = activeCampaigns.length > 0
            ? activeCampaigns.reduce((best, c) => (c.roas > best.roas ? c : best))
            : campaigns[0] ?? null;
        const finance = cashFlow === null
            ? EMPTY_DASHBOARD_FINANCE
            : (() => {
                const monthlyTrend = cashFlow.monthlyCashFlow.filter((entry) => entry.month === currentMonthKey);
                return {
                    revenue: cashFlow.totalRevenue,
                    expenses: cashFlow.totalExpenses,
                    netProfit: cashFlow.netProfit,
                    monthlyTrend: monthlyTrend.map((m) => ({
                        month: m.month,
                        income: m.income,
                        expense: m.expense,
                    })),
                };
            })();
        return {
            user: {
                name: user?.name ?? 'Usuário',
                notificationCount: pendingEvents,
            },
            finance,
            contentAndMeta: {
                topCampaign: topCampaign
                    ? {
                        id: topCampaign.id,
                        name: topCampaign.name,
                        roas: topCampaign.roas,
                        spend: topCampaign.spend,
                        ctr: topCampaign.ctr,
                        status: topCampaign.status,
                    }
                    : null,
                scheduledPosts: scheduledPosts.map((p) => ({
                    id: p.id,
                    title: p.title,
                    platform: p.platform.toLowerCase(),
                    scheduledDate: p.scheduledDate.toISOString(),
                })),
            },
            calendar: {
                todayMeetings: todayEvents,
            },
            kanban: {
                myTasks: myTasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    column: t.column.title,
                    priority: t.priority.toLowerCase(),
                })),
            },
        };
    }
    async getTvMonitoring() {
        const now = new Date();
        const { year, month, start: periodStart, end: periodEnd } = this.getCurrentMonthBounds(now);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const activeTransactionWhere = {
            deletedAt: null,
        };
        const [taskStatusCounts, leadStatusCounts, paidIncome, paidExpense, pendingIncome, pendingExpense, overdueIncome, overdueExpense, urgentTasks, deliveryPipelineTasks,] = await Promise.all([
            this.prisma.kanbanTask.groupBy({
                by: ['status'],
                where: { deletedAt: null },
                _count: { _all: true },
            }),
            this.prisma.lead.groupBy({
                by: ['status'],
                where: {
                    deletedAt: null,
                    crmStatus: client_1.CrmLeadStatus.ACTIVE,
                    kanbanTracked: true,
                },
                _count: { _all: true },
            }),
            this.prisma.financialTransaction.aggregate({
                where: {
                    ...activeTransactionWhere,
                    type: client_1.TransactionType.INCOME,
                    status: client_1.TransactionStatus.PAID,
                    date: { gte: periodStart, lte: periodEnd },
                },
                _sum: { amount: true },
            }),
            this.prisma.financialTransaction.aggregate({
                where: {
                    ...activeTransactionWhere,
                    type: client_1.TransactionType.EXPENSE,
                    status: client_1.TransactionStatus.PAID,
                    date: { gte: periodStart, lte: periodEnd },
                },
                _sum: { amount: true },
            }),
            this.prisma.financialTransaction.aggregate({
                where: {
                    ...activeTransactionWhere,
                    type: client_1.TransactionType.INCOME,
                    status: client_1.TransactionStatus.PENDING,
                    OR: [
                        { dueDate: { gte: periodStart, lte: periodEnd } },
                        { dueDate: null, date: { gte: periodStart, lte: periodEnd } },
                    ],
                },
                _sum: { amount: true },
                _count: { _all: true },
            }),
            this.prisma.financialTransaction.aggregate({
                where: {
                    ...activeTransactionWhere,
                    type: client_1.TransactionType.EXPENSE,
                    status: client_1.TransactionStatus.PENDING,
                    OR: [
                        { dueDate: { gte: periodStart, lte: periodEnd } },
                        { dueDate: null, date: { gte: periodStart, lte: periodEnd } },
                    ],
                },
                _sum: { amount: true },
                _count: { _all: true },
            }),
            this.prisma.financialTransaction.aggregate({
                where: {
                    ...activeTransactionWhere,
                    type: client_1.TransactionType.INCOME,
                    status: client_1.TransactionStatus.OVERDUE,
                },
                _sum: { amount: true },
                _count: { _all: true },
            }),
            this.prisma.financialTransaction.aggregate({
                where: {
                    ...activeTransactionWhere,
                    type: client_1.TransactionType.EXPENSE,
                    status: client_1.TransactionStatus.OVERDUE,
                },
                _sum: { amount: true },
                _count: { _all: true },
            }),
            this.prisma.kanbanTask.findMany({
                where: {
                    deletedAt: null,
                    status: { not: client_1.KanbanTaskStatus.OK },
                    OR: [
                        { dueDate: { lt: now } },
                        {
                            dueDate: { gte: startOfToday, lte: endOfToday },
                        },
                        {
                            slaResolutionDueAt: { lt: now },
                            resolvedAt: null,
                        },
                        { priority: client_1.KanbanTaskPriority.CRITICAL },
                    ],
                },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    dueDate: true,
                    slaResolutionDueAt: true,
                    client: { select: { companyName: true } },
                },
                orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
                take: 20,
            }),
            this.prisma.kanbanTask.findMany({
                where: {
                    deletedAt: null,
                    status: {
                        in: [
                            client_1.KanbanTaskStatus.FALTA_GRAVAR,
                            client_1.KanbanTaskStatus.PRODUCAO,
                            client_1.KanbanTaskStatus.JHONATAN_APROVOU,
                        ],
                    },
                },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    priority: true,
                    dueDate: true,
                    client: { select: { companyName: true } },
                },
                orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }, { title: 'asc' }],
            }),
        ]);
        const delivery = (0, dashboard_tv_constants_1.createEmptyTvTaskDeliveryMetrics)();
        const deliveryTasks = (0, dashboard_tv_constants_1.createEmptyTvTaskDeliveryTasks)();
        for (const row of taskStatusCounts) {
            const bucket = (0, dashboard_tv_constants_1.resolveTvTaskDeliveryBucket)(row.status);
            if (!bucket)
                continue;
            delivery[bucket] += row._count._all;
            delivery.total += row._count._all;
        }
        for (const task of deliveryPipelineTasks) {
            const bucket = (0, dashboard_tv_constants_1.resolveTvTaskDeliveryBucket)(task.status);
            if (!bucket)
                continue;
            deliveryTasks[bucket].push({
                id: task.id,
                title: task.title,
                status: (0, dashboard_tv_constants_1.serializeTaskStatus)(task.status),
                priority: task.priority.toLowerCase(),
                dueDate: task.dueDate?.toISOString() ?? null,
                clientName: task.client?.companyName ?? null,
            });
        }
        const leadStages = (0, dashboard_tv_constants_1.applyLeadStageCounts)((0, dashboard_tv_constants_1.buildLeadStageTemplate)(), leadStatusCounts.map((row) => ({
            status: row.status,
            count: row._count._all,
        })));
        const totalRevenue = Number(paidIncome._sum.amount ?? 0);
        const totalExpenses = Number(paidExpense._sum.amount ?? 0);
        const netProfit = totalRevenue - totalExpenses;
        const pendingReceivables = Number(pendingIncome._sum.amount ?? 0);
        const pendingPayables = Number(pendingExpense._sum.amount ?? 0);
        const overdueReceivables = Number(overdueIncome._sum.amount ?? 0);
        const overduePayables = Number(overdueExpense._sum.amount ?? 0);
        return {
            generatedAt: now.toISOString(),
            tasks: {
                delivery: {
                    ...delivery,
                    tasks: deliveryTasks,
                },
                urgent: urgentTasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    status: (0, dashboard_tv_constants_1.serializeTaskStatus)(task.status),
                    priority: task.priority.toLowerCase(),
                    dueDate: task.dueDate?.toISOString() ?? null,
                    slaResolutionDueAt: task.slaResolutionDueAt?.toISOString() ?? null,
                    clientName: task.client?.companyName ?? null,
                    urgency: this.resolveTaskUrgency(task, now, startOfToday, endOfToday),
                })),
            },
            leads: {
                stages: leadStages,
                totalActive: leadStages.reduce((sum, stage) => sum + stage.count, 0),
            },
            finance: {
                period: { month, year },
                totalRevenue: this.roundCurrency(totalRevenue),
                totalExpenses: this.roundCurrency(totalExpenses),
                netProfit: this.roundCurrency(netProfit),
                profitMargin: totalRevenue > 0
                    ? this.roundCurrency((netProfit / totalRevenue) * 100)
                    : 0,
                pendingReceivables: this.roundCurrency(pendingReceivables),
                pendingPayables: this.roundCurrency(pendingPayables),
                pendingReceivablesCount: pendingIncome._count._all,
                pendingPayablesCount: pendingExpense._count._all,
                overdueReceivables: this.roundCurrency(overdueReceivables),
                overduePayables: this.roundCurrency(overduePayables),
                overdueReceivablesCount: overdueIncome._count._all,
                overduePayablesCount: overdueExpense._count._all,
            },
        };
    }
    getCurrentMonthBounds(reference = new Date()) {
        const year = reference.getFullYear();
        const month = reference.getMonth() + 1;
        const start = new Date(year, reference.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(year, reference.getMonth() + 1, 0, 23, 59, 59, 999);
        return { year, month, start, end };
    }
    resolveTaskUrgency(task, now, startOfToday, endOfToday) {
        if (task.priority === client_1.KanbanTaskPriority.CRITICAL) {
            return 'critical';
        }
        if (task.slaResolutionDueAt && task.slaResolutionDueAt < now) {
            return 'sla_breach';
        }
        if (task.dueDate && task.dueDate < startOfToday) {
            return 'overdue';
        }
        if (task.dueDate &&
            task.dueDate >= startOfToday &&
            task.dueDate <= endOfToday) {
            return 'due_today';
        }
        return 'attention';
    }
    roundCurrency(value) {
        return Number(value.toFixed(2));
    }
    async getMyKanbanTasks(userId) {
        const lastColumn = await this.prisma.kanbanColumn.findFirst({
            orderBy: { order: 'desc' },
            select: { id: true },
        });
        return this.prisma.kanbanTask.findMany({
            where: {
                assignees: { some: { userId } },
                ...(lastColumn ? { columnId: { not: lastColumn.id } } : {}),
            },
            include: { column: { select: { title: true } } },
            orderBy: [{ columnId: 'asc' }, { order: 'asc' }],
            take: 5,
        });
    }
    async getTodayEvents() {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const events = await this.calendarService.getEvents({
            from: start.toISOString(),
            to: end.toISOString(),
        });
        return events.map((e) => ({
            id: e.id,
            title: e.title,
            startAt: e.startAt,
            endAt: e.endAt,
            category: e.category,
            color: e.color,
            isPending: e.isPending,
        }));
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        finance_service_1.FinanceService,
        calendar_service_1.CalendarService,
        meta_insights_service_1.MetaInsightsService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map