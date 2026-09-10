import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Contract,
  Client,
  FinancialCategory,
  FinancialTransaction,
  PaymentFrequency,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import { PrismaService } from '../prisma/prisma.service';
import { seedDefaultFinancialCategories, syncFinancialCategories } from './finance-category-defaults';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { BulkImportTransactionsDto } from './dto/import-transactions.dto';
import {
  CreateTransactionDto,
  QueryTransactionsDto,
  SortOrder,
  TransactionSortField,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import { QueryFinanceDto } from './dto/query-finance.dto';
import { QueryFinanceCalendarDto } from './dto/query-finance-calendar.dto';

type FinancePeriodOptions = Pick<QueryFinanceDto, 'month' | 'year'>;

type TransactionWithCategory = FinancialTransaction & {
  category: FinancialCategory | null;
};

@Injectable()
export class FinanceService {
  private static readonly CASH_FLOW_STATUSES = [
    TransactionStatus.PAID,
    TransactionStatus.PENDING,
  ] as const;

  private static readonly PENDING_ALERT_STATUSES = [
    TransactionStatus.PENDING,
    TransactionStatus.OVERDUE,
  ] as const;

  constructor(private readonly prisma: PrismaService) {}

  private activeTransactionWhere(
    _userId: string,
    criteria: Prisma.FinancialTransactionWhereInput = {},
  ): Prisma.FinancialTransactionWhereInput {
    return {
      AND: [
        { companyId: DEFAULT_COMPANY_ID, deletedAt: null },
        criteria,
      ],
    };
  }

  private activeTransactionScope(
    criteria: Prisma.FinancialTransactionWhereInput = {},
  ): Prisma.FinancialTransactionWhereInput {
    return {
      AND: [{ deletedAt: null }, criteria],
    };
  }

  async getCategories(type?: TransactionType) {
    const categories = await this.prisma.financialCategory.findMany({
      where: type ? { type } : undefined,
      orderBy: { name: 'asc' },
    });
    return categories;
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.financialCategory.findFirst({
      where: {
        companyId: DEFAULT_COMPANY_ID,
        name: { equals: dto.name.trim(), mode: 'insensitive' },
        type: dto.type,
      },
    });

    if (existing) {
      throw new BadRequestException('Já existe uma categoria com este nome');
    }

    return this.prisma.financialCategory.create({
      data: {
        companyId: DEFAULT_COMPANY_ID,
        name: dto.name.trim(),
        type: dto.type,
        color: dto.color ?? '#004949',
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.ensureCategoryExists(id);

    return this.prisma.financialCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string) {
    await this.ensureCategoryExists(id);

    const transactionCount = await this.prisma.financialTransaction.count({
      where: { categoryId: id },
    });

    if (transactionCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma categoria com transações vinculadas',
      );
    }

    await this.prisma.financialCategory.delete({ where: { id } });
  }

  async getCashFlow(userId: string, period?: FinancePeriodOptions) {
    const now = new Date();
    const year = period?.year ?? now.getFullYear();
    const hasMonthFilter = period?.month !== undefined;
    const month = period?.month ?? now.getMonth() + 1;

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const periodStart = hasMonthFilter
      ? new Date(year, month - 1, 1)
      : startOfYear;
    const periodEnd = hasMonthFilter
      ? new Date(year, month, 0, 23, 59, 59, 999)
      : endOfYear;

    const transactions = await this.prisma.financialTransaction.findMany({
      where: this.activeTransactionWhere(userId, {
        date: { gte: startOfYear, lte: endOfYear },
        status: { in: [...FinanceService.CASH_FLOW_STATUSES] },
      }),
      include: { category: true },
    });

    const pendingTransactions = await this.prisma.financialTransaction.findMany({
      where: this.activeTransactionWhere(userId, {
        status: { in: [...FinanceService.PENDING_ALERT_STATUSES] },
        OR: [
          {
            dueDate: { gte: periodStart, lte: periodEnd },
          },
          {
            dueDate: null,
            date: { gte: periodStart, lte: periodEnd },
          },
        ],
      }),
    });

    const monthlyMap = new Map<string, { income: number; expense: number }>();

    for (let m = 0; m < 12; m++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { income: 0, expense: 0 });
    }

    const categoryMap = new Map<
      string,
      { categoryId: string; categoryName: string; amount: number; color: string }
    >();

    let totalRevenue = 0;
    let totalExpenses = 0;
    let pendingReceivables = 0;
    let pendingPayables = 0;

    for (const tx of pendingTransactions) {
      const amount = Number(tx.amount);
      if (tx.type === TransactionType.INCOME) {
        pendingReceivables += amount;
      } else {
        pendingPayables += amount;
      }
    }

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      const monthData = monthlyMap.get(monthKey) ?? { income: 0, expense: 0 };
      const inSelectedPeriod =
        tx.date >= periodStart && tx.date <= periodEnd;

      if (tx.type === TransactionType.INCOME) {
        monthData.income += amount;
        if (inSelectedPeriod) totalRevenue += amount;
      } else {
        monthData.expense += amount;
        if (inSelectedPeriod) {
          totalExpenses += amount;

          const existing = categoryMap.get(tx.categoryId);
          if (existing) {
            existing.amount += amount;
          } else {
            categoryMap.set(tx.categoryId, {
              categoryId: tx.categoryId,
              categoryName: tx.category.name,
              amount,
              color: tx.category.color,
            });
          }
        }
      }

      monthlyMap.set(monthKey, monthData);
    }

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const monthlyCashFlow = Array.from(monthlyMap.entries()).map(
      ([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
      }),
    );

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      pendingReceivables,
      pendingPayables,
      monthlyCashFlow,
      expenseByCategory: Array.from(categoryMap.values()),
      period: {
        month: hasMonthFilter ? month : null,
        year,
      },
    };
  }

  async getFinancialCalendar(
    userId: string,
    query: QueryFinanceCalendarDto = {},
  ) {
    const period = this.resolveCalendarPeriod(query);
    const rangeStart = this.parseRangeStart(period.startDate);
    const rangeEnd = this.parseRangeEnd(period.endDate);

    const where = this.activeTransactionWhere(userId, {
      OR: [
        { dueDate: { gte: rangeStart, lte: rangeEnd } },
        { dueDate: null, date: { gte: rangeStart, lte: rangeEnd } },
      ],
      ...(query.clientId ? { clientId: query.clientId } : {}),
    });

    const transactions = await this.prisma.financialTransaction.findMany({
      where,
      include: { category: true },
      orderBy: [{ date: 'asc' }],
    });

    const dayBuckets = this.buildCalendarDayBuckets(rangeStart, rangeEnd);
    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      const scheduledAt = tx.dueDate ?? tx.date;
      const dateKey = this.formatCalendarDateKey(scheduledAt);
      const bucket = dayBuckets.get(dateKey);
      if (!bucket) continue;

      const item = this.toCalendarTransaction(tx, dateKey);
      const amount = Number(tx.amount);

      if (tx.type === TransactionType.INCOME) {
        bucket.income.push(item);
        bucket.totals.income += amount;
        totalIncome += amount;
      } else {
        bucket.expense.push(item);
        bucket.totals.expense += amount;
        totalExpense += amount;
      }
    }

    const days = Array.from(dayBuckets.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, bucket]) => ({
        date,
        income: bucket.income,
        expense: bucket.expense,
        totals: {
          income: Number(bucket.totals.income.toFixed(2)),
          expense: Number(bucket.totals.expense.toFixed(2)),
          net: Number((bucket.totals.income - bucket.totals.expense).toFixed(2)),
        },
      }));

    const byDate = Object.fromEntries(
      days.map((day) => [
        day.date,
        {
          income: day.income,
          expense: day.expense,
          totals: day.totals,
        },
      ]),
    );

    return {
      period,
      days,
      byDate,
      totals: {
        income: Number(totalIncome.toFixed(2)),
        expense: Number(totalExpense.toFixed(2)),
        net: Number((totalIncome - totalExpense).toFixed(2)),
        transactionCount: transactions.length,
      },
    };
  }

  async getOverview(userId: string, period?: FinancePeriodOptions) {
    const cashFlow = await this.getCashFlow(userId, period);

    const year = period?.year ?? new Date().getFullYear();
    const month = period?.month ?? new Date().getMonth() + 1;
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const recentTransactions = await this.prisma.financialTransaction.findMany({
      where: this.activeTransactionWhere(userId, {
        date: period?.month
          ? { gte: startOfMonth, lte: endOfMonth }
          : { gte: new Date(year, 0, 1) },
      }),
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 5,
    });

    return {
      ...cashFlow,
      recentTransactions: recentTransactions.map((tx) =>
        this.toTransactionResponse(tx),
      ),
    };
  }

  async getTransactions(userId: string, query: QueryTransactionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.FinancialTransactionWhereInput =
      this.activeTransactionWhere(userId);

    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const categoryIds = query.categoryIds?.length
      ? query.categoryIds
      : query.categoryId
        ? [query.categoryId]
        : undefined;

    if (categoryIds?.length) {
      where.categoryId = { in: categoryIds };
    }

    const from = query.from ?? query.startDate;
    const to = query.to ?? query.endDate;

    if (from || to) {
      const dateRange: Prisma.DateTimeFilter = {};
      if (from) dateRange.gte = this.parseRangeStart(from);
      if (to) dateRange.lte = this.parseRangeEnd(to);

      where.OR = [
        { dueDate: dateRange },
        { date: dateRange },
      ];
    }

    if (query.search?.trim()) {
      where.description = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    const sortBy = query.sortBy ?? TransactionSortField.DATE;
    const sortOrder = query.sortOrder ?? SortOrder.ASC;

    const orderBy: Prisma.FinancialTransactionOrderByWithRelationInput[] =
      sortBy === TransactionSortField.DATE
        ? [{ dueDate: sortOrder }, { date: sortOrder }]
        : [{ [sortBy]: sortOrder }];

    const [total, transactions] = await Promise.all([
      this.prisma.financialTransaction.count({ where }),
      this.prisma.financialTransaction.findMany({
        where,
        include: { category: true },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      data: transactions.map((tx) => this.toTransactionResponse(tx)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async generateSalaryExpensesForEmployee(input: {
    createdByUserId: string;
    employeeName: string;
    monthlySalary: number;
    months?: number;
  }) {
    const companyId = DEFAULT_COMPANY_ID;
    await seedDefaultFinancialCategories(this.prisma, companyId);

    const category = await this.prisma.financialCategory.findFirst({
      where: {
        type: TransactionType.EXPENSE,
        name: 'Salários',
      },
    });

    if (!category) {
      throw new BadRequestException('Salary expense category not found');
    }

    const months = input.months ?? 12;
    const now = new Date();
    const recurrenceDay = Math.min(now.getDate(), 28);
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(recurrenceDay).padStart(2, '0')}`;

    return this.createTransaction(input.createdByUserId, {
      title: `Salário — ${input.employeeName}`,
      description: `Salário mensal — ${input.employeeName}`,
      amount: input.monthlySalary,
      type: TransactionType.EXPENSE,
      status: TransactionStatus.PENDING,
      date,
      dueDate: date,
      categoryId: category.id,
      recurrenceDay,
      recurrenceMonths: months,
    });
  }

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    await this.ensureCategoryExists(dto.categoryId);
    await this.validateCategoryType(dto.categoryId, dto.type);
    if (dto.clientId) await this.ensureClientExists(dto.clientId);

    const status = this.resolveStatus(
      dto.status ?? TransactionStatus.PENDING,
      this.parseDateOnly(dto.date),
      dto.dueDate ? this.parseDateOnly(dto.dueDate) : undefined,
    );

    const recurrenceMonths = dto.recurrenceMonths ?? 0;
    const recurrenceDay = dto.recurrenceDay;
    const baseDate = this.parseDateOnly(dto.date);
    const title = dto.title?.trim() || null;

    if (recurrenceMonths > 1 && recurrenceDay) {
      const created: TransactionWithCategory[] = [];
      for (let index = 0; index < recurrenceMonths; index++) {
        const occurrence = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth() + index,
          1,
          12,
          0,
          0,
          0,
        );
        const lastDay = new Date(
          occurrence.getFullYear(),
          occurrence.getMonth() + 1,
          0,
        ).getDate();
        occurrence.setDate(Math.min(recurrenceDay, lastDay));

        const transaction = await this.prisma.financialTransaction.create({
          data: {
            title,
            description: dto.description,
            amount: dto.amount,
            type: dto.type,
            status:
              index === 0 ? status : TransactionStatus.PENDING,
            date: occurrence,
            dueDate: dto.dueDate ? this.parseDateOnly(dto.dueDate) : null,
            categoryId: dto.categoryId,
            userId,
            clientId: dto.clientId,
          },
          include: { category: true },
        });
        created.push(transaction);
      }

      return this.toTransactionResponse(created[0]);
    }

    const transaction = await this.prisma.financialTransaction.create({
      data: {
        title,
        description: dto.description,
        amount: dto.amount,
        type: dto.type,
        status,
        date: baseDate,
        dueDate: dto.dueDate ? this.parseDateOnly(dto.dueDate) : null,
        categoryId: dto.categoryId,
        userId,
        clientId: dto.clientId,
      },
      include: { category: true },
    });

    return this.toTransactionResponse(transaction);
  }

  async updateTransaction(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ) {
    const existing = await this.findUserTransaction(userId, id);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
      const type = dto.type ?? existing.type;
      await this.validateCategoryType(dto.categoryId, type);
    }

    if (dto.clientId) await this.ensureClientExists(dto.clientId);

    const date = dto.date ? this.parseDateOnly(dto.date) : existing.date;
    const dueDate =
      dto.dueDate !== undefined
        ? dto.dueDate
          ? this.parseDateOnly(dto.dueDate)
          : null
        : existing.dueDate;
    const status = dto.status
      ? this.resolveStatus(dto.status, date, dueDate ?? undefined)
      : existing.status === TransactionStatus.OVERDUE
        ? TransactionStatus.PENDING
        : existing.status;

    const transaction = await this.prisma.financialTransaction.update({
      where: { id },
      data: {
        title: dto.title === undefined ? undefined : dto.title,
        description: dto.description,
        amount: dto.amount,
        type: dto.type,
        categoryId: dto.categoryId,
        clientId:
          dto.clientId === undefined
            ? undefined
            : dto.clientId,
        date: dto.date ? this.parseDateOnly(dto.date) : undefined,
        dueDate:
          dto.dueDate !== undefined
            ? dto.dueDate
              ? this.parseDateOnly(dto.dueDate)
              : null
            : undefined,
        status,
      },
      include: { category: true },
    });

    return this.toTransactionResponse(transaction);
  }

  async deleteTransaction(userId: string, id: string) {
    await this.findUserTransaction(userId, id);

    await this.prisma.financialTransaction.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  async bulkImportTransactions(
    userId: string,
    dto: BulkImportTransactionsDto,
  ) {
    await syncFinancialCategories(this.prisma, DEFAULT_COMPANY_ID);

    const categories = await this.prisma.financialCategory.findMany();
    const categoryByKey = new Map(
      categories.map((category) => [
        `${category.type}:${this.normalizeCategoryName(category.name)}`,
        category,
      ]),
    );

    const created: ReturnType<FinanceService['toTransactionResponse']>[] = [];
    const errors: Array<{ index: number; message: string }> = [];

    for (const [index, item] of dto.transactions.entries()) {
      try {
        const transactionType = item.type ?? TransactionType.EXPENSE;
        const category = await this.ensureImportCategory(
          item.categoryName,
          transactionType,
          categoryByKey,
        );

        const date = this.parseDateOnly(item.date);
        const dueDate = item.dueDate
          ? this.parseDateOnly(item.dueDate)
          : null;
        const status = this.resolveStatus(
          item.status ?? TransactionStatus.PENDING,
          date,
          dueDate ?? undefined,
        );

        const transaction = await this.prisma.financialTransaction.create({
          data: {
            title: item.companyName?.trim() || null,
            description: item.description,
            amount: item.amount,
            type: transactionType,
            status,
            date,
            dueDate,
            categoryId: category.id,
            userId,
          },
          include: { category: true },
        });

        created.push(this.toTransactionResponse(transaction));
      } catch (error) {
        errors.push({
          index,
          message:
            error instanceof Error
              ? error.message
              : 'Não foi possível importar a linha',
        });
      }
    }

    return {
      created: created.length,
      errors,
      transactions: created,
    };
  }

  async generateReceivablesFromContract(
    userId: string,
    contract: Contract & { client: Client },
  ) {
    const existingCount = await this.prisma.financialTransaction.count({
      where: this.activeTransactionScope({ contractId: contract.id }),
    });

    if (existingCount > 0) {
      throw new BadRequestException(
        'Receivables have already been generated for this contract',
      );
    }

    const category = await this.resolveIncomeCategory();
    const schedules = this.buildPaymentSchedule(contract);
    const amount = Number(contract.recurringValue);

    const created = await this.prisma.$transaction(
      schedules.map((schedule) =>
        this.prisma.financialTransaction.create({
          data: {
            title: contract.title,
            description: `Contrato: ${contract.title} — ${contract.client.companyName} (${schedule.label})`,
            amount,
            type: TransactionType.INCOME,
            status: TransactionStatus.PENDING,
            date: schedule.date,
            dueDate: schedule.date,
            categoryId: category.id,
            userId,
            clientId: contract.clientId,
            contractId: contract.id,
          },
          include: { category: true },
        }),
      ),
    );

    return created.map((tx) => this.toTransactionResponse(tx));
  }

  private async resolveIncomeCategory() {
    const preferred = await this.prisma.financialCategory.findFirst({
      where: {
        type: TransactionType.INCOME,
        name: { in: ['Vendas', 'Retainer', 'Contratos', 'Projetos'] },
      },
    });

    if (preferred) return preferred;

    const fallback = await this.prisma.financialCategory.findFirst({
      where: { type: TransactionType.INCOME },
    });

    if (!fallback) {
      throw new BadRequestException(
        'No income category found to create receivables',
      );
    }

    return fallback;
  }

  private buildPaymentSchedule(contract: Contract) {
    const start = new Date(contract.startDate);
    start.setHours(12, 0, 0, 0);

    if (contract.paymentFrequency === PaymentFrequency.ONE_TIME) {
      return [{ date: start, label: 'Único' }];
    }

    const end = contract.endDate
      ? new Date(contract.endDate)
      : new Date(start.getFullYear(), start.getMonth() + 11, start.getDate());

    end.setHours(12, 0, 0, 0);

    const schedules: { date: Date; label: string }[] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const monthLabel = cursor.toLocaleDateString('pt-BR', {
        month: 'short',
        year: 'numeric',
      });
      schedules.push({
        date: new Date(cursor),
        label: monthLabel,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return schedules.length > 0 ? schedules : [{ date: start, label: 'Único' }];
  }

  private resolveStatus(
    status: TransactionStatus,
    _date: Date,
    _dueDate?: Date,
  ): TransactionStatus {
    if (status === TransactionStatus.PAID) return TransactionStatus.PAID;
    return TransactionStatus.PENDING;
  }

  private parseDateOnly(value: string): Date {
    const datePart = value.slice(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) {
      return new Date(value);
    }
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  private normalizeCategoryName(value: string): string {
    return value
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/\.+$/g, '')
      .replace(/\s+/g, ' ');
  }

  private resolveImportCategory(
    categoryName: string,
    categoryByName: Map<string, FinancialCategory>,
  ): FinancialCategory | null {
    const normalized = this.normalizeCategoryName(categoryName);
    if (!normalized) return null;

    const exact = categoryByName.get(normalized);
    if (exact) return exact;

    for (const [name, category] of categoryByName.entries()) {
      if (name.includes(normalized) || normalized.includes(name)) {
        return category;
      }
    }

    return null;
  }

  private async ensureImportCategory(
    categoryName: string,
    type: TransactionType,
    categoryByKey: Map<string, FinancialCategory>,
  ): Promise<FinancialCategory> {
    const normalized = this.normalizeCategoryName(categoryName);
    const key = `${type}:${normalized}`;
    const existing = categoryByKey.get(key);
    if (existing) return existing;

    const scopedCategories = new Map(
      [...categoryByKey.entries()]
        .filter(([mapKey]) => mapKey.startsWith(`${type}:`))
        .map(([mapKey, category]) => [
          mapKey.slice(type.length + 1),
          category,
        ]),
    );

    const resolved = this.resolveImportCategory(categoryName, scopedCategories);
    if (resolved) {
      categoryByKey.set(key, resolved);
      return resolved;
    }

    const created = await this.prisma.financialCategory.upsert({
      where: {
        companyId_name_type: {
          companyId: DEFAULT_COMPANY_ID,
          name: categoryName.trim(),
          type,
        },
      },
      update: {},
      create: {
        companyId: DEFAULT_COMPANY_ID,
        name: categoryName.trim(),
        type,
        color: type === TransactionType.INCOME ? '#10B981' : '#004949',
      },
    });

    categoryByKey.set(
      `${created.type}:${this.normalizeCategoryName(created.name)}`,
      created,
    );
    return created;
  }

  private parseRangeStart(value: string): Date {
    const datePart = value.slice(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return new Date(value);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private parseRangeEnd(value: string): Date {
    const datePart = value.slice(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) {
      const endDate = new Date(value);
      endDate.setHours(23, 59, 59, 999);
      return endDate;
    }
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  private resolveCalendarPeriod(query: QueryFinanceCalendarDto) {
    if (query.startDate || query.endDate) {
      const startDate = (query.startDate ?? query.endDate ?? '').slice(0, 10);
      const endDate = (query.endDate ?? query.startDate ?? '').slice(0, 10);
      return { startDate, endDate };
    }

    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const month = query.month ?? now.getMonth() + 1;
    const start = new Date(year, month - 1, 1, 12, 0, 0, 0);
    const end = new Date(year, month, 0, 12, 0, 0, 0);

    return {
      startDate: this.formatCalendarDateKey(start),
      endDate: this.formatCalendarDateKey(end),
    };
  }

  private buildCalendarDayBuckets(start: Date, end: Date) {
    const buckets = new Map<
      string,
      {
        income: ReturnType<FinanceService['toCalendarTransaction']>[];
        expense: ReturnType<FinanceService['toCalendarTransaction']>[];
        totals: { income: number; expense: number };
      }
    >();

    const cursor = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
      12,
      0,
      0,
      0,
    );
    const endCursor = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate(),
      12,
      0,
      0,
      0,
    );

    while (cursor <= endCursor) {
      buckets.set(this.formatCalendarDateKey(cursor), {
        income: [],
        expense: [],
        totals: { income: 0, expense: 0 },
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return buckets;
  }

  private formatCalendarDateKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toCalendarTransaction(
    tx: TransactionWithCategory,
    scheduledDate: string,
  ) {
    return {
      id: tx.id,
      title: tx.title ?? tx.description,
      description: tx.description,
      amount: Number(tx.amount),
      type: tx.type.toLowerCase() as 'income' | 'expense',
      status: tx.status.toLowerCase() as 'paid' | 'pending' | 'overdue',
      scheduledDate,
      date: tx.date.toISOString(),
      dueDate: tx.dueDate?.toISOString() ?? null,
      categoryId: tx.categoryId,
      category: tx.category?.name ?? 'Sem categoria',
      categoryColor: tx.category?.color ?? '#94A3B8',
      clientId: tx.clientId,
    };
  }

  private async ensureCategoryExists(id: string) {
    const category = await this.prisma.financialCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  private async validateCategoryType(
    categoryId: string,
    type: TransactionType,
  ) {
    const category = await this.ensureCategoryExists(categoryId);
    if (category.type !== type) {
      throw new BadRequestException(
        'Transaction type does not match category type',
      );
    }
  }

  private async ensureClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  private async findUserTransaction(userId: string, id: string) {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: this.activeTransactionWhere(userId, { id }),
      include: { category: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  private toTransactionResponse(tx: TransactionWithCategory) {
    return {
      id: tx.id,
      title: tx.title ?? tx.description,
      description: tx.description,
      amount: Number(tx.amount),
      type: tx.type.toLowerCase() as 'income' | 'expense',
      status: tx.status.toLowerCase() as 'paid' | 'pending' | 'overdue',
      date: tx.date.toISOString(),
      dueDate: tx.dueDate?.toISOString() ?? null,
      categoryId: tx.categoryId,
      category: tx.category?.name ?? 'Sem categoria',
      categoryColor: tx.category?.color ?? '#94A3B8',
      clientId: tx.clientId,
      contractId: tx.contractId,
      createdAt: tx.createdAt.toISOString(),
    };
  }

  async getDueTodayAlerts(userId: string) {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const transactions = await this.prisma.financialTransaction.findMany({
      where: this.activeTransactionWhere(userId, {
        OR: [
          {
            status: TransactionStatus.PENDING,
            dueDate: { gte: startOfDay, lte: endOfDay },
          },
          {
            status: TransactionStatus.OVERDUE,
          },
        ],
      }),
      include: {
        category: true,
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            email: true,
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { date: 'asc' }],
    });

    const dueToday = transactions.filter(
      (tx) =>
        tx.status === TransactionStatus.PENDING &&
        tx.dueDate !== null &&
        tx.dueDate >= startOfDay &&
        tx.dueDate <= endOfDay,
    );
    const overdue = transactions.filter(
      (tx) => tx.status === TransactionStatus.OVERDUE,
    );

    const mapAlert = (
      tx: (typeof transactions)[number],
    ) => ({
      ...this.toTransactionResponse(tx),
      client: tx.client
        ? {
            id: tx.client.id,
            companyName: tx.client.companyName,
            contactName: tx.client.contactName,
            email: tx.client.email,
          }
        : null,
    });

    return {
      dueToday: dueToday.map(mapAlert),
      overdue: overdue.map(mapAlert),
      alerts: [...dueToday, ...overdue].map(mapAlert),
      totals: {
        dueTodayCount: dueToday.length,
        overdueCount: overdue.length,
        dueTodayAmount: dueToday.reduce(
          (sum, tx) => sum + Number(tx.amount),
          0,
        ),
        overdueAmount: overdue.reduce(
          (sum, tx) => sum + Number(tx.amount),
          0,
        ),
      },
    };
  }

  async getMonthlyCashflow(userId: string, period?: FinancePeriodOptions) {
    const cashFlow = await this.getCashFlow(userId, period);
    const year = cashFlow.period.year;

    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];

    const incomeColors = '#10B981';
    const expenseColors = '#EF4444';

    const income = cashFlow.monthlyCashFlow.map((entry, monthIndex) => ({
      categoryId: `${entry.month}-income`,
      categoryName: `${monthNames[monthIndex]}/${year}`,
      amount: Number(entry.income.toFixed(2)),
      color: incomeColors,
    }));

    const expense = cashFlow.monthlyCashFlow.map((entry, monthIndex) => ({
      categoryId: `${entry.month}-expense`,
      categoryName: `${monthNames[monthIndex]}/${year}`,
      amount: Number(entry.expense.toFixed(2)),
      color: expenseColors,
    }));

    return {
      income,
      expense,
      expenseByCategory: expense,
      monthlyCashFlow: cashFlow.monthlyCashFlow,
      period: cashFlow.period,
    };
  }

  async getClientFinances(clientId: string) {
    await this.ensureClientExists(clientId);

    const transactions = await this.prisma.financialTransaction.findMany({
      where: this.activeTransactionScope({
        OR: [{ clientId }, { contract: { clientId } }],
        type: TransactionType.INCOME,
      }),
      include: { category: true },
      orderBy: [{ dueDate: 'asc' }, { date: 'desc' }],
    });

    const pending = transactions.filter(
      (tx) => tx.status === TransactionStatus.PENDING,
    );
    const paid = transactions.filter(
      (tx) => tx.status === TransactionStatus.PAID,
    );
    const overdue = transactions.filter(
      (tx) => tx.status === TransactionStatus.OVERDUE,
    );

    const totalDue = [...pending, ...overdue].reduce(
      (sum, tx) => sum + Number(tx.amount),
      0,
    );
    const totalPaid = paid.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalOverdue = overdue.reduce(
      (sum, tx) => sum + Number(tx.amount),
      0,
    );

    return {
      clientId,
      pending: pending.map((tx) => this.toTransactionResponse(tx)),
      paid: paid.map((tx) => this.toTransactionResponse(tx)),
      overdue: overdue.map((tx) => this.toTransactionResponse(tx)),
      invoices: transactions.map((tx) => this.toTransactionResponse(tx)),
      totals: {
        totalDue: Number(totalDue.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        totalOverdue: Number(totalOverdue.toFixed(2)),
        pendingCount: pending.length,
        paidCount: paid.length,
        overdueCount: overdue.length,
      },
    };
  }
}
