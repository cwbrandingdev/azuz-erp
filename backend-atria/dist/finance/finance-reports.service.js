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
exports.FinanceReportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const company_constants_1 = require("../company/company.constants");
const prisma_service_1 = require("../prisma/prisma.service");
const finance_service_1 = require("./finance.service");
const MONTH_LABELS = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
];
const BLOCKS = [
    { key: client_1.CashFlowBlock.OPERATIONAL, title: '01 Fluxo Operacional' },
    {
        key: client_1.CashFlowBlock.FINANCIAL_MOVEMENTS,
        title: '02 Movimentações Financeiras e dos Sócios',
    },
    {
        key: client_1.CashFlowBlock.OWN_ACCOUNT_TRANSFER,
        title: '03 Transferências entre Contas Próprias',
    },
];
function money(value) {
    return Math.round(value * 100) / 100;
}
function parseStart(value) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
}
function parseEnd(value) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
}
function isoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}
function endOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}
function effectiveDate(tx) {
    return tx.dueDate ?? tx.date;
}
function signedCash(tx) {
    const amount = Number(tx.amount);
    return tx.type === client_1.TransactionType.INCOME ? amount : -amount;
}
function dreBucket(tx) {
    const amount = Number(tx.amount);
    const group = tx.category?.dreGroup;
    if (group === client_1.DreGroup.TRANSFER)
        return { bucket: 'ignore', amount: 0 };
    if (group === client_1.DreGroup.DEDUCTION)
        return { bucket: 'deduction', amount };
    if (group === client_1.DreGroup.VARIABLE_COST)
        return { bucket: 'variable', amount };
    if (group === client_1.DreGroup.FIXED_EXPENSE)
        return { bucket: 'fixed', amount };
    if (group === client_1.DreGroup.PROFIT_DISTRIBUTION) {
        return { bucket: 'distribution', amount };
    }
    if (group === client_1.DreGroup.FINANCIAL_RESULT) {
        return {
            bucket: 'financial',
            amount: tx.type === client_1.TransactionType.INCOME ? amount : -amount,
        };
    }
    if (tx.type === client_1.TransactionType.INCOME)
        return { bucket: 'revenue', amount };
    return { bucket: 'fixed', amount };
}
let FinanceReportsService = class FinanceReportsService {
    prisma;
    financeService;
    constructor(prisma, financeService) {
        this.prisma = prisma;
        this.financeService = financeService;
    }
    async getManagementDashboard(query) {
        await this.financeService.ensureChartOfAccounts();
        const now = new Date();
        const from = query.from
            ? parseStart(query.from)
            : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const to = query.to ? parseEnd(query.to) : endOfToday();
        const todayEnd = endOfToday();
        const todayStart = startOfToday();
        const [periodTx, paidTx, openTx, banks] = await Promise.all([
            this.prisma.financialTransaction.findMany({
                where: {
                    companyId: company_constants_1.DEFAULT_COMPANY_ID,
                    deletedAt: null,
                    date: { gte: from, lte: to },
                },
                include: { category: true, bankAccount: true },
            }),
            this.prisma.financialTransaction.findMany({
                where: {
                    companyId: company_constants_1.DEFAULT_COMPANY_ID,
                    deletedAt: null,
                    status: client_1.TransactionStatus.PAID,
                    date: { lte: todayEnd },
                },
                include: { category: true, bankAccount: true },
            }),
            this.prisma.financialTransaction.findMany({
                where: {
                    companyId: company_constants_1.DEFAULT_COMPANY_ID,
                    deletedAt: null,
                    status: { in: [client_1.TransactionStatus.PENDING, client_1.TransactionStatus.OVERDUE] },
                },
                include: { category: true, bankAccount: true },
            }),
            this.prisma.bankAccount.findMany({
                where: { companyId: company_constants_1.DEFAULT_COMPANY_ID },
                orderBy: { name: 'asc' },
            }),
        ]);
        const year = query.chartYear ?? from.getFullYear();
        const yearTx = await this.prisma.financialTransaction.findMany({
            where: {
                companyId: company_constants_1.DEFAULT_COMPANY_ID,
                deletedAt: null,
                date: {
                    gte: new Date(year, 0, 1, 0, 0, 0, 0),
                    lte: new Date(year, 11, 31, 23, 59, 59, 999),
                },
            },
            include: { category: true, bankAccount: true },
        });
        let availableBalance = 0;
        const balanceByBank = new Map();
        for (const bank of banks) {
            balanceByBank.set(bank.id, Number(bank.initialBalance));
        }
        let unassigned = 0;
        for (const tx of paidTx) {
            const signed = signedCash(tx);
            availableBalance += signed;
            if (tx.bankAccountId && balanceByBank.has(tx.bankAccountId)) {
                balanceByBank.set(tx.bankAccountId, (balanceByBank.get(tx.bankAccountId) ?? 0) + signed);
            }
            else {
                unassigned += signed;
            }
        }
        const overdueIncome = openTx.filter((tx) => tx.type === client_1.TransactionType.INCOME &&
            effectiveDate(tx).getTime() < todayStart.getTime());
        const overdueExpense = openTx.filter((tx) => tx.type === client_1.TransactionType.EXPENSE &&
            effectiveDate(tx).getTime() < todayStart.getTime());
        const horizons = [7, 15, 30].map((days) => {
            const horizonEnd = new Date(todayStart);
            horizonEnd.setDate(horizonEnd.getDate() + days - 1);
            horizonEnd.setHours(23, 59, 59, 999);
            let income = 0;
            let expense = 0;
            for (const tx of openTx) {
                const when = effectiveDate(tx);
                if (when < todayStart || when > horizonEnd)
                    continue;
                if (tx.type === client_1.TransactionType.INCOME)
                    income += Number(tx.amount);
                else
                    expense += Number(tx.amount);
            }
            return {
                days,
                income: money(income),
                expense: money(expense),
                balance: money(availableBalance + income - expense),
            };
        });
        const totals = {
            revenue: 0,
            deduction: 0,
            variable: 0,
            fixed: 0,
            financial: 0,
            distribution: 0,
        };
        for (const tx of periodTx) {
            const part = dreBucket(tx);
            if (part.bucket === 'ignore')
                continue;
            totals[part.bucket] += part.amount;
        }
        const contribution = totals.revenue - totals.deduction - totals.variable;
        const operating = contribution - totals.fixed;
        const net = operating + totals.financial;
        const marginRatio = totals.revenue > 0 ? contribution / totals.revenue : 0;
        const breakEven = marginRatio > 0 ? totals.fixed / marginRatio : totals.fixed;
        const profitability = totals.revenue > 0 ? (net / totals.revenue) * 100 : 0;
        const monthly = MONTH_LABELS.map((label, index) => ({
            month: `${year}-${String(index + 1).padStart(2, '0')}`,
            label,
            income: 0,
            expense: 0,
            result: 0,
        }));
        for (const tx of yearTx) {
            const bucket = monthly[tx.date.getMonth()];
            if (!bucket)
                continue;
            if (tx.type === client_1.TransactionType.INCOME)
                bucket.income += Number(tx.amount);
            else
                bucket.expense += Number(tx.amount);
        }
        for (const bucket of monthly) {
            bucket.income = money(bucket.income);
            bucket.expense = money(bucket.expense);
            bucket.result = money(bucket.income - bucket.expense);
        }
        const percent = (value) => totals.revenue > 0 ? money((value / totals.revenue) * 100) : 0;
        return {
            period: { from: isoDate(from), to: isoDate(to) },
            availableBalance: money(availableBalance),
            banks: banks.map((bank) => ({
                id: bank.id,
                name: bank.name,
                balance: money(balanceByBank.get(bank.id) ?? 0),
            })),
            unassignedBalance: money(unassigned),
            overdue: {
                incomeCount: overdueIncome.length,
                incomeAmount: money(overdueIncome.reduce((sum, tx) => sum + Number(tx.amount), 0)),
                expenseCount: overdueExpense.length,
                expenseAmount: money(overdueExpense.reduce((sum, tx) => sum + Number(tx.amount), 0)),
            },
            projection: horizons,
            breakEven: money(breakEven),
            aboveEquilibrium: totals.revenue >= breakEven && totals.revenue > 0,
            profitability: money(profitability),
            statement: [
                {
                    label: 'Receita Bruta',
                    amount: money(totals.revenue),
                    percent: percent(totals.revenue),
                },
                {
                    label: '(-) Dedução das Receitas',
                    amount: money(-totals.deduction),
                    percent: percent(-totals.deduction),
                },
                {
                    label: '(-) Custos Variáveis',
                    amount: money(-totals.variable),
                    percent: percent(-totals.variable),
                },
                {
                    label: '(=) Margem de Contribuição',
                    amount: money(contribution),
                    percent: percent(contribution),
                    emphasize: true,
                },
                {
                    label: '(-) Despesas Fixas',
                    amount: money(-totals.fixed),
                    percent: percent(-totals.fixed),
                },
                {
                    label: '(=) Resultado Operacional',
                    amount: money(operating),
                    percent: percent(operating),
                    emphasize: true,
                },
                {
                    label: '(+/-) Resultado Financeiro',
                    amount: money(totals.financial),
                    percent: percent(totals.financial),
                },
                {
                    label: '(=) Resultado Líquido do Mês',
                    amount: money(net),
                    percent: percent(net),
                    emphasize: true,
                },
            ],
            monthly,
        };
    }
    async getCashFlowStatement(query) {
        await this.financeService.ensureChartOfAccounts();
        const now = new Date();
        const from = query.from
            ? parseStart(query.from)
            : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const to = query.to
            ? parseEnd(query.to)
            : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const transactions = await this.prisma.financialTransaction.findMany({
            where: {
                companyId: company_constants_1.DEFAULT_COMPANY_ID,
                deletedAt: null,
                date: { gte: from, lte: to },
                status: query.status
                    ? query.status
                    : { in: [client_1.TransactionStatus.PAID, client_1.TransactionStatus.PENDING, client_1.TransactionStatus.OVERDUE] },
                ...(query.type ? { type: query.type } : {}),
                ...(query.categoryId ? { categoryId: query.categoryId } : {}),
                ...(query.bankAccountId ? { bankAccountId: query.bankAccountId } : {}),
                ...(query.search?.trim()
                    ? {
                        description: {
                            contains: query.search.trim(),
                            mode: 'insensitive',
                        },
                    }
                    : {}),
            },
            include: { category: true, bankAccount: true },
            orderBy: { date: 'asc' },
        });
        const blocks = BLOCKS.map((block) => {
            const entries = transactions
                .filter((tx) => (tx.category?.cashFlowBlock ?? client_1.CashFlowBlock.OPERATIONAL) === block.key)
                .map((tx) => this.toEntry(tx));
            const income = entries
                .filter((entry) => entry.type === 'income')
                .reduce((sum, entry) => sum + entry.amount, 0);
            const expense = entries
                .filter((entry) => entry.type === 'expense')
                .reduce((sum, entry) => sum + entry.amount, 0);
            return {
                key: block.key,
                title: block.title,
                entries,
                income: money(income),
                expense: money(expense),
                balance: money(income - expense),
            };
        });
        return {
            period: { from: isoDate(from), to: isoDate(to) },
            blocks,
            netVariation: money(blocks.reduce((sum, block) => sum + block.balance, 0)),
        };
    }
    async getProjectedCashFlow(query) {
        await this.financeService.ensureChartOfAccounts();
        const todayEnd = endOfToday();
        const tomorrow = startOfToday();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const paid = await this.prisma.financialTransaction.findMany({
            where: {
                companyId: company_constants_1.DEFAULT_COMPANY_ID,
                deletedAt: null,
                status: client_1.TransactionStatus.PAID,
                date: { lte: todayEnd },
            },
        });
        const currentBalance = money(paid.reduce((sum, tx) => sum + signedCash(tx), 0));
        const pending = await this.prisma.financialTransaction.findMany({
            where: {
                companyId: company_constants_1.DEFAULT_COMPANY_ID,
                deletedAt: null,
                status: { in: [client_1.TransactionStatus.PENDING, client_1.TransactionStatus.OVERDUE] },
                ...(query.type ? { type: query.type } : {}),
            },
            include: { category: true, bankAccount: true },
            orderBy: { date: 'asc' },
        });
        const limit = query.to ? parseEnd(query.to) : null;
        const grouped = new Map();
        for (const tx of pending) {
            const when = effectiveDate(tx);
            if (when < tomorrow)
                continue;
            if (limit && when > limit)
                continue;
            const key = isoDate(when);
            const list = grouped.get(key) ?? [];
            list.push(tx);
            grouped.set(key, list);
        }
        let running = currentBalance;
        const days = [...grouped.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([date, items]) => {
            const income = items
                .filter((tx) => tx.type === client_1.TransactionType.INCOME)
                .reduce((sum, tx) => sum + Number(tx.amount), 0);
            const expense = items
                .filter((tx) => tx.type === client_1.TransactionType.EXPENSE)
                .reduce((sum, tx) => sum + Number(tx.amount), 0);
            running = money(running + income - expense);
            return {
                date,
                income: money(income),
                expense: money(expense),
                balance: running,
                items: items.map((tx) => this.toEntry(tx)),
            };
        });
        return { currentBalance, days };
    }
    async getAnnualDre(query) {
        await this.financeService.ensureChartOfAccounts();
        const year = query.year ?? new Date().getFullYear();
        const transactions = await this.prisma.financialTransaction.findMany({
            where: {
                companyId: company_constants_1.DEFAULT_COMPANY_ID,
                deletedAt: null,
                date: {
                    gte: new Date(year, 0, 1, 0, 0, 0, 0),
                    lte: new Date(year, 11, 31, 23, 59, 59, 999),
                },
            },
            include: { category: true, bankAccount: true },
        });
        const paid = transactions.filter((tx) => tx.status === client_1.TransactionStatus.PAID);
        const sections = [
            this.section('Total das Receitas', transactions, (tx) => dreBucket(tx).bucket === 'revenue', false),
            this.section('(-) Dedução das Receitas', transactions, (tx) => dreBucket(tx).bucket === 'deduction', true),
            this.section('(-) Custos Variáveis', transactions, (tx) => dreBucket(tx).bucket === 'variable', true),
            this.section('(-) Despesas Fixas', transactions, (tx) => dreBucket(tx).bucket === 'fixed', true),
            this.section('(+/-) Resultado Financeiro', transactions, (tx) => dreBucket(tx).bucket === 'financial', false),
            this.section('Distribuição de Lucro', transactions, (tx) => dreBucket(tx).bucket === 'distribution', true),
        ];
        const monthValue = (section, month) => section.totals[month] ?? 0;
        const managerial = Array.from({ length: 12 }, (_, month) => money(monthValue(sections[0], month) +
            monthValue(sections[1], month) +
            monthValue(sections[2], month) +
            monthValue(sections[3], month) +
            monthValue(sections[4], month)));
        const finalResult = managerial.map((value, index) => money(value + monthValue(sections[5], index)));
        let running = 0;
        const availableBalance = Array.from({ length: 12 }, (_, month) => {
            for (const tx of paid) {
                if (tx.date.getMonth() !== month)
                    continue;
                running += signedCash(tx);
            }
            return money(running);
        });
        return {
            year,
            months: MONTH_LABELS,
            sections: sections.map((section) => ({
                ...section,
                rows: section.rows.filter((row) => row.total !== 0),
            })),
            managerialResult: managerial,
            finalResult,
            availableBalance,
        };
    }
    section(title, transactions, include, invertExpenseSign) {
        const rows = new Map();
        for (const tx of transactions) {
            if (!include(tx))
                continue;
            const part = dreBucket(tx);
            const display = invertExpenseSign && part.bucket !== 'financial'
                ? part.amount
                : part.bucket === 'financial'
                    ? part.amount
                    : part.amount;
            const signed = invertExpenseSign ? -Math.abs(part.amount) : display;
            const key = tx.categoryId;
            const row = rows.get(key) ?? {
                categoryId: tx.categoryId,
                code: tx.category?.code ?? null,
                name: tx.category?.name ?? 'Sem categoria',
                months: Array.from({ length: 12 }, () => 0),
                total: 0,
            };
            row.months[tx.date.getMonth()] = money(row.months[tx.date.getMonth()] + signed);
            row.total = money(row.total + signed);
            rows.set(key, row);
        }
        const list = [...rows.values()].sort((left, right) => (left.code ?? left.name).localeCompare(right.code ?? right.name, 'pt-BR'));
        const totals = Array.from({ length: 12 }, (_, month) => money(list.reduce((sum, row) => sum + row.months[month], 0)));
        return {
            title,
            rows: list,
            totals,
            yearTotal: money(totals.reduce((sum, value) => sum + value, 0)),
        };
    }
    toEntry(tx) {
        return {
            id: tx.id,
            date: tx.date.toISOString(),
            dueDate: tx.dueDate?.toISOString() ?? null,
            description: tx.description,
            type: tx.type.toLowerCase(),
            status: tx.status.toLowerCase(),
            amount: money(Number(tx.amount)),
            categoryId: tx.categoryId,
            categoryName: tx.category?.name ?? 'Sem categoria',
            categoryCode: tx.category?.code ?? null,
            bankAccountId: tx.bankAccountId,
            bankName: tx.bankAccount?.name ?? null,
        };
    }
};
exports.FinanceReportsService = FinanceReportsService;
exports.FinanceReportsService = FinanceReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        finance_service_1.FinanceService])
], FinanceReportsService);
//# sourceMappingURL=finance-reports.service.js.map