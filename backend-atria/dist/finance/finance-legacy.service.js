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
exports.FinanceLegacyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const transaction_dto_1 = require("./dto/transaction.dto");
const CASH_FLOW_STATUSES = new Set(['PAID', 'PENDING']);
const PENDING_STATUSES = new Set(['PENDING', 'OVERDUE']);
let FinanceLegacyService = class FinanceLegacyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCategories(type) {
        const rows = await this.prisma.$queryRaw `
      SELECT id, name, type::text AS type, color
      FROM public."FinancialCategory"
      ORDER BY name ASC
    `;
        if (!type)
            return rows;
        return rows.filter((row) => row.type === type);
    }
    async getOverview(period) {
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
    async getTransactions(query) {
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
                const matches = (value) => (!start || value >= start) && (!end || value <= end);
                return matches(scheduled) || matches(row.date);
            });
        }
        const search = query.search?.trim().toLowerCase();
        if (search) {
            rows = rows.filter((row) => row.description.toLowerCase().includes(search));
        }
        const sortBy = query.sortBy ?? transaction_dto_1.TransactionSortField.DATE;
        const direction = query.sortOrder === transaction_dto_1.SortOrder.DESC ? -1 : 1;
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
    async getCashFlow(period) {
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
        const monthlyMap = new Map();
        for (let index = 0; index < 12; index += 1) {
            monthlyMap.set(`${year}-${String(index + 1).padStart(2, '0')}`, {
                income: 0,
                expense: 0,
            });
        }
        const categoryMap = new Map();
        let totalRevenue = 0;
        let totalExpenses = 0;
        let pendingReceivables = 0;
        let pendingPayables = 0;
        for (const row of rows) {
            const amount = Number(row.amount);
            const scheduled = row.dueDate ?? row.date;
            if (PENDING_STATUSES.has(row.status) &&
                scheduled >= periodStart &&
                scheduled <= periodEnd) {
                if (row.type === 'INCOME')
                    pendingReceivables += amount;
                else
                    pendingPayables += amount;
            }
            if (!CASH_FLOW_STATUSES.has(row.status))
                continue;
            if (row.date.getFullYear() !== year)
                continue;
            const monthKey = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}`;
            const monthData = monthlyMap.get(monthKey) ?? { income: 0, expense: 0 };
            const inSelectedPeriod = row.date >= periodStart && row.date <= periodEnd;
            if (row.type === 'INCOME') {
                monthData.income += amount;
                if (inSelectedPeriod)
                    totalRevenue += amount;
            }
            else {
                monthData.expense += amount;
                if (inSelectedPeriod) {
                    totalExpenses += amount;
                    const existing = categoryMap.get(row.categoryId);
                    if (existing) {
                        existing.amount += amount;
                    }
                    else {
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
            profitMargin: totalRevenue > 0
                ? Math.round((netProfit / totalRevenue) * 10000) / 100
                : 0,
            pendingReceivables,
            pendingPayables,
            monthlyCashFlow: Array.from(monthlyMap.entries()).map(([monthKey, data]) => ({
                month: monthKey,
                income: data.income,
                expense: data.expense,
            })),
            expenseByCategory: Array.from(categoryMap.values()),
            period: {
                month: hasMonthFilter ? month : null,
                year,
            },
        };
    }
    async loadRows() {
        return this.prisma.$queryRaw `
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
    toResponse(row) {
        return {
            id: row.id,
            title: row.title ?? row.description,
            description: row.description,
            amount: Number(row.amount),
            type: row.type.toLowerCase(),
            status: row.status.toLowerCase(),
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
    compare(left, right, sortBy) {
        if (sortBy === transaction_dto_1.TransactionSortField.AMOUNT) {
            return Number(left.amount) - Number(right.amount);
        }
        if (sortBy === transaction_dto_1.TransactionSortField.DESCRIPTION) {
            return left.description.localeCompare(right.description, 'pt-BR');
        }
        if (sortBy === transaction_dto_1.TransactionSortField.STATUS) {
            return left.status.localeCompare(right.status);
        }
        const leftDate = left.dueDate ?? left.date;
        const rightDate = right.dueDate ?? right.date;
        return leftDate.getTime() - rightDate.getTime();
    }
    parseStart(value) {
        const [year, month, day] = value.slice(0, 10).split('-').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
    }
    parseEnd(value) {
        const [year, month, day] = value.slice(0, 10).split('-').map(Number);
        return new Date(year, month - 1, day, 23, 59, 59, 999);
    }
};
exports.FinanceLegacyService = FinanceLegacyService;
exports.FinanceLegacyService = FinanceLegacyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FinanceLegacyService);
//# sourceMappingURL=finance-legacy.service.js.map