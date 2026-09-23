import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryFinanceDto } from './dto/query-finance.dto';
import {
  QueryTransactionsDto,
  SortOrder,
  TransactionSortField,
} from './dto/transaction.dto';

type LegacyRow = {
  id: string;
  description: string;
  amount: Prisma.Decimal;
  type: string;
  status: string;
  date: Date;
  dueDate: Date | null;
  categoryId: string;
  title: string | null;
  clientId: string | null;
  contractId: string | null;
  createdAt: Date;
  categoryName: string | null;
  categoryColor: string | null;
};

const CASH_FLOW_STATUSES = new Set(['PAID', 'PENDING']);
const PENDING_STATUSES = new Set(['PENDING', 'OVERDUE']);

@Injectable()
export class FinanceLegacyService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(type?: string) {
    const rows = await this.prisma.$queryRaw<
      { id: string; name: string; type: string; color: string }[]
    >`
      SELECT id, name, type::text AS type, color
      FROM public."FinancialCategory"
      ORDER BY name ASC
    `;

    if (!type) return rows;
    return rows.filter((row) => row.type === type);
  }

  async getOverview(period?: Pick<QueryFinanceDto, 'month' | 'year'>) {
    const cashFlow = await this.getCashFlow(period);
    const year = period?.year ?? new Date().getFullYear();
    const month = period?.month ?? new Date().getMonth() + 1;
    const start = period?.month
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const end = period?.month
      ? new Date(year, month, 0, 23, 59, 59, 999)
      : new Date(year, 11, 31, 23, 59, 59, 999);

    const recent = (await this.loadRows())
      .filter((row) => row.date >= start && row.date <= end)
      .sort((left, right) => right.date.getTime() - left.date.getTime())
      .slice(0, 5)
      .map((row) => this.toResponse(row));

    return { ...cashFlow, recentTransactions: recent };
  }

  async getTransactions(query: QueryTransactionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    let rows = await this.loadRows();

    if (query.type) {
      rows = rows.filter((row) => row.type === query.type);
    }
    if (query.status) {
      rows = rows.filter((row) => row.status === query.status);
    }

    const categoryIds = query.categoryIds?.length
      ? query.categoryIds
      : query.categoryId
        ? [query.categoryId]
        : undefined;
    if (categoryIds?.length) {
      const allowed = new Set(categoryIds);
      rows = rows.filter((row) => allowed.has(row.categoryId));
    }

    const from = query.from ?? query.startDate;
    const to = query.to ?? query.endDate;
    if (from || to) {
      const start = from ? this.parseStart(from) : null;
      const end = to ? this.parseEnd(to) : null;
      rows = rows.filter((row) => {
        const scheduled = row.dueDate ?? row.date;
        const matches = (value: Date) =>
          (!start || value >= start) && (!end || value <= end);
        return matches(scheduled) || matches(row.date);
      });
    }

    const search = query.search?.trim().toLowerCase();
    if (search) {
      rows = rows.filter((row) =>
        row.description.toLowerCase().includes(search),
      );
    }

    const sortBy = query.sortBy ?? TransactionSortField.DATE;
    const direction = query.sortOrder === SortOrder.DESC ? -1 : 1;
    rows.sort((left, right) => {
      const compared = this.compare(left, right, sortBy);
      return compared * direction;
    });

    const total = rows.length;
    const data = rows
      .slice((page - 1) * limit, page * limit)
      .map((row) => this.toResponse(row));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async getCashFlow(period?: Pick<QueryFinanceDto, 'month' | 'year'>) {
    const now = new Date();
    const year = period?.year ?? now.getFullYear();
    const hasMonthFilter = period?.month !== undefined;
    const month = period?.month ?? now.getMonth() + 1;
    const periodStart = hasMonthFilter
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);
    const periodEnd = hasMonthFilter
      ? new Date(year, month, 0, 23, 59, 59, 999)
      : new Date(year, 11, 31, 23, 59, 59, 999);

    const rows = await this.loadRows();
    const monthlyMap = new Map<string, { income: number; expense: number }>();
    for (let index = 0; index < 12; index += 1) {
      monthlyMap.set(`${year}-${String(index + 1).padStart(2, '0')}`, {
        income: 0,
        expense: 0,
      });
    }

    const categoryMap = new Map<
      string,
      { categoryId: string; categoryName: string; amount: number; color: string }
    >();
    let totalRevenue = 0;
    let totalExpenses = 0;
    let pendingReceivables = 0;
    let pendingPayables = 0;

    for (const row of rows) {
      const amount = Number(row.amount);
      const scheduled = row.dueDate ?? row.date;
      if (
        PENDING_STATUSES.has(row.status) &&
        scheduled >= periodStart &&
        scheduled <= periodEnd
      ) {
        if (row.type === 'INCOME') pendingReceivables += amount;
        else pendingPayables += amount;
      }

      if (!CASH_FLOW_STATUSES.has(row.status)) continue;
      if (row.date.getFullYear() !== year) continue;

      const monthKey = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}`;
      const monthData = monthlyMap.get(monthKey) ?? { income: 0, expense: 0 };
      const inSelectedPeriod = row.date >= periodStart && row.date <= periodEnd;

      if (row.type === 'INCOME') {
        monthData.income += amount;
        if (inSelectedPeriod) totalRevenue += amount;
      } else {
        monthData.expense += amount;
        if (inSelectedPeriod) {
          totalExpenses += amount;
          const existing = categoryMap.get(row.categoryId);
          if (existing) {
            existing.amount += amount;
          } else {
            categoryMap.set(row.categoryId, {
              categoryId: row.categoryId,
              categoryName: row.categoryName ?? 'Sem categoria',
              amount,
              color: row.categoryColor ?? '#94A3B8',
            });
          }
        }
      }
      monthlyMap.set(monthKey, monthData);
    }

    const netProfit = totalRevenue - totalExpenses;
    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin:
        totalRevenue > 0
          ? Math.round((netProfit / totalRevenue) * 10000) / 100
          : 0,
      pendingReceivables,
      pendingPayables,
      monthlyCashFlow: Array.from(monthlyMap.entries()).map(
        ([monthKey, data]) => ({
          month: monthKey,
          income: data.income,
          expense: data.expense,
        }),
      ),
      expenseByCategory: Array.from(categoryMap.values()),
      period: {
        month: hasMonthFilter ? month : null,
        year,
      },
    };
  }

  private async loadRows() {
    return this.prisma.$queryRaw<LegacyRow[]>`
      SELECT
        t.id,
        t.description,
        t.amount,
        t.type::text AS type,
        t.status::text AS status,
        t.date,
        t."dueDate",
        t."categoryId",
        t.title,
        t."clientId",
        t."contractId",
        t."createdAt",
        c.name AS "categoryName",
        c.color AS "categoryColor"
      FROM public."FinancialTransaction" t
      LEFT JOIN public."FinancialCategory" c ON c.id = t."categoryId"
      WHERE t.deleted_at IS NULL
    `;
  }

  private toResponse(row: LegacyRow) {
    return {
      id: row.id,
      title: row.title ?? row.description,
      description: row.description,
      amount: Number(row.amount),
      type: row.type.toLowerCase() as 'income' | 'expense',
      status: row.status.toLowerCase() as 'paid' | 'pending' | 'overdue',
      date: row.date.toISOString(),
      dueDate: row.dueDate?.toISOString() ?? null,
      categoryId: row.categoryId,
      category: row.categoryName ?? 'Sem categoria',
      categoryColor: row.categoryColor ?? '#94A3B8',
      clientId: row.clientId,
      contractId: row.contractId,
      bankAccountId: null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private compare(left: LegacyRow, right: LegacyRow, sortBy: TransactionSortField) {
    if (sortBy === TransactionSortField.AMOUNT) {
      return Number(left.amount) - Number(right.amount);
    }
    if (sortBy === TransactionSortField.DESCRIPTION) {
      return left.description.localeCompare(right.description, 'pt-BR');
    }
    if (sortBy === TransactionSortField.STATUS) {
      return left.status.localeCompare(right.status);
    }
    const leftDate = left.dueDate ?? left.date;
    const rightDate = right.dueDate ?? right.date;
    return leftDate.getTime() - rightDate.getTime();
  }

  private parseStart(value: string) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private parseEnd(value: string) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }
}
