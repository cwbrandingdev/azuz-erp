import { Injectable } from '@nestjs/common';
import {
  ContentPostStatus,
  CrmLeadStatus,
  KanbanTaskPriority,
  KanbanTaskStatus,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { CalendarService } from '../calendar/calendar.service';
import { FinanceService } from '../finance/finance.service';
import { MetaInsightsService } from '../meta-insights/meta-insights.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  applyLeadStageCounts,
  buildLeadStageTemplate,
  createEmptyTvTaskDeliveryMetrics,
  createEmptyTvTaskDeliveryTasks,
  resolveTvTaskDeliveryBucket,
  serializeTaskStatus,
} from './dashboard-tv.constants';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceService,
    private readonly calendarService: CalendarService,
    private readonly metaInsightsService: MetaInsightsService,
  ) {}

  async getOverview(userId: string) {
    const now = new Date();
    const { year, month } = this.getCurrentMonthBounds(now);
    const currentMonthKey = `${year}-${String(month).padStart(2, '0')}`;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const [cashFlow, campaigns, scheduledPosts, todayEvents, myTasks, pendingEvents] =
      await Promise.all([
        this.financeService.getCashFlow(userId, { year, month }),
        Promise.resolve(this.metaInsightsService.getCampaigns()),
        this.prisma.contentPost.findMany({
          where: {
            status: ContentPostStatus.SCHEDULED,
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
    const topCampaign =
      activeCampaigns.length > 0
        ? activeCampaigns.reduce((best, c) => (c.roas > best.roas ? c : best))
        : campaigns[0] ?? null;

    const monthlyTrend = cashFlow.monthlyCashFlow.filter(
      (entry) => entry.month === currentMonthKey,
    );

    return {
      user: {
        name: user?.name ?? 'Usuário',
        notificationCount: pendingEvents,
      },
      finance: {
        revenue: cashFlow.totalRevenue,
        expenses: cashFlow.totalExpenses,
        netProfit: cashFlow.netProfit,
        monthlyTrend: monthlyTrend.map((m) => ({
          month: m.month,
          income: m.income,
          expense: m.expense,
        })),
      },
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
          scheduledDate: p.scheduledDate!.toISOString(),
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
    const { year, month, start: periodStart, end: periodEnd } =
      this.getCurrentMonthBounds(now);
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const activeTransactionWhere = {
      deletedAt: null,
    } as const;

    const [
      taskStatusCounts,
      leadStatusCounts,
      paidIncome,
      paidExpense,
      pendingIncome,
      pendingExpense,
      overdueIncome,
      overdueExpense,
      urgentTasks,
      deliveryPipelineTasks,
    ] = await Promise.all([
      this.prisma.kanbanTask.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: {
          deletedAt: null,
          crmStatus: CrmLeadStatus.ACTIVE,
          kanbanTracked: true,
        },
        _count: { _all: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          ...activeTransactionWhere,
          type: TransactionType.INCOME,
          status: TransactionStatus.PAID,
          date: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          ...activeTransactionWhere,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.PAID,
          date: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          ...activeTransactionWhere,
          type: TransactionType.INCOME,
          status: TransactionStatus.PENDING,
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
          type: TransactionType.EXPENSE,
          status: TransactionStatus.PENDING,
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
          type: TransactionType.INCOME,
          status: TransactionStatus.OVERDUE,
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.financialTransaction.aggregate({
        where: {
          ...activeTransactionWhere,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.OVERDUE,
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.kanbanTask.findMany({
        where: {
          deletedAt: null,
          status: { not: KanbanTaskStatus.OK },
          OR: [
            { dueDate: { lt: now } },
            {
              dueDate: { gte: startOfToday, lte: endOfToday },
            },
            {
              slaResolutionDueAt: { lt: now },
              resolvedAt: null,
            },
            { priority: KanbanTaskPriority.CRITICAL },
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
              KanbanTaskStatus.FALTA_GRAVAR,
              KanbanTaskStatus.PRODUCAO,
              KanbanTaskStatus.JHONATAN_APROVOU,
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

    const delivery = createEmptyTvTaskDeliveryMetrics();
    const deliveryTasks = createEmptyTvTaskDeliveryTasks();

    for (const row of taskStatusCounts) {
      const bucket = resolveTvTaskDeliveryBucket(row.status);
      if (!bucket) continue;
      delivery[bucket] += row._count._all;
      delivery.total += row._count._all;
    }

    for (const task of deliveryPipelineTasks) {
      const bucket = resolveTvTaskDeliveryBucket(task.status);
      if (!bucket) continue;
      deliveryTasks[bucket].push({
        id: task.id,
        title: task.title,
        status: serializeTaskStatus(task.status),
        priority: task.priority.toLowerCase(),
        dueDate: task.dueDate?.toISOString() ?? null,
        clientName: task.client?.companyName ?? null,
      });
    }

    const leadStages = applyLeadStageCounts(
      buildLeadStageTemplate(),
      leadStatusCounts.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
    );

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
          status: serializeTaskStatus(task.status),
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
        profitMargin:
          totalRevenue > 0
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

  private getCurrentMonthBounds(reference = new Date()) {
    const year = reference.getFullYear();
    const month = reference.getMonth() + 1;
    const start = new Date(year, reference.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(year, reference.getMonth() + 1, 0, 23, 59, 59, 999);
    return { year, month, start, end };
  }

  private resolveTaskUrgency(
    task: {
      priority: KanbanTaskPriority;
      dueDate: Date | null;
      slaResolutionDueAt: Date | null;
    },
    now: Date,
    startOfToday: Date,
    endOfToday: Date,
  ) {
    if (task.priority === KanbanTaskPriority.CRITICAL) {
      return 'critical';
    }
    if (task.slaResolutionDueAt && task.slaResolutionDueAt < now) {
      return 'sla_breach';
    }
    if (task.dueDate && task.dueDate < startOfToday) {
      return 'overdue';
    }
    if (
      task.dueDate &&
      task.dueDate >= startOfToday &&
      task.dueDate <= endOfToday
    ) {
      return 'due_today';
    }
    return 'attention';
  }

  private roundCurrency(value: number) {
    return Number(value.toFixed(2));
  }

  private async getMyKanbanTasks(userId: string) {
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

  private async getTodayEvents() {
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
}
