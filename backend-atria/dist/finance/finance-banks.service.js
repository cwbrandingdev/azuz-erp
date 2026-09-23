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
exports.FinanceBanksService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const company_constants_1 = require("../company/company.constants");
const prisma_service_1 = require("../prisma/prisma.service");
const finance_service_1 = require("./finance.service");
const finance_ofx_1 = require("./finance-ofx");
let FinanceBanksService = class FinanceBanksService {
    prisma;
    financeService;
    constructor(prisma, financeService) {
        this.prisma = prisma;
        this.financeService = financeService;
    }
    async listAccounts() {
        const accounts = await this.prisma.bankAccount.findMany({
            where: { companyId: company_constants_1.DEFAULT_COMPANY_ID },
            orderBy: { name: 'asc' },
        });
        return accounts.map((account) => ({
            id: account.id,
            name: account.name,
            institution: account.institution,
            initialBalance: Number(account.initialBalance),
        }));
    }
    async createAccount(dto) {
        const name = dto.name.trim();
        const existing = await this.prisma.bankAccount.findFirst({
            where: {
                companyId: company_constants_1.DEFAULT_COMPANY_ID,
                name: { equals: name, mode: 'insensitive' },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Já existe uma conta com este nome');
        }
        const account = await this.prisma.bankAccount.create({
            data: {
                companyId: company_constants_1.DEFAULT_COMPANY_ID,
                name,
                institution: dto.institution?.trim() || null,
                initialBalance: dto.initialBalance ?? 0,
            },
        });
        return {
            id: account.id,
            name: account.name,
            institution: account.institution,
            initialBalance: Number(account.initialBalance),
        };
    }
    async updateAccount(id, dto) {
        await this.ensureAccount(id);
        const account = await this.prisma.bankAccount.update({
            where: { id },
            data: {
                name: dto.name?.trim(),
                institution: dto.institution === undefined ? undefined : dto.institution.trim() || null,
                initialBalance: dto.initialBalance,
            },
        });
        return {
            id: account.id,
            name: account.name,
            institution: account.institution,
            initialBalance: Number(account.initialBalance),
        };
    }
    async deleteAccount(id) {
        await this.ensureAccount(id);
        const [transactions, lines] = await Promise.all([
            this.prisma.financialTransaction.count({
                where: { bankAccountId: id, deletedAt: null },
            }),
            this.prisma.bankStatementLine.count({ where: { bankAccountId: id } }),
        ]);
        if (transactions > 0 || lines > 0) {
            throw new common_1.BadRequestException('Não é possível excluir uma conta com lançamentos ou extrato');
        }
        await this.prisma.bankAccount.delete({ where: { id } });
    }
    async importOfx(bankAccountId, dto) {
        await this.ensureAccount(bankAccountId);
        const parsed = (0, finance_ofx_1.parseOfx)(dto.content);
        if (parsed.length === 0) {
            throw new common_1.BadRequestException('Nenhum lançamento encontrado no OFX');
        }
        let created = 0;
        let skipped = 0;
        const seen = new Set();
        for (const line of parsed) {
            if (seen.has(line.fitId)) {
                skipped += 1;
                continue;
            }
            seen.add(line.fitId);
            const existing = await this.prisma.bankStatementLine.findFirst({
                where: { bankAccountId, fitId: line.fitId },
            });
            if (existing) {
                skipped += 1;
                continue;
            }
            await this.prisma.bankStatementLine.create({
                data: {
                    companyId: company_constants_1.DEFAULT_COMPANY_ID,
                    bankAccountId,
                    fitId: line.fitId,
                    postedAt: this.parseDate(line.postedAt),
                    amount: line.amount,
                    description: line.description,
                    type: line.type,
                },
            });
            created += 1;
        }
        return { created, skipped };
    }
    async getReconciliation(bankAccountId) {
        await this.financeService.ensureChartOfAccounts();
        const lineWhere = {
            companyId: company_constants_1.DEFAULT_COMPANY_ID,
            ignored: false,
            transactionId: null,
            ...(bankAccountId ? { bankAccountId } : {}),
        };
        const [lines, transactions, accounts] = await Promise.all([
            this.prisma.bankStatementLine.findMany({
                where: lineWhere,
                include: { bankAccount: true },
                orderBy: { postedAt: 'desc' },
            }),
            this.prisma.financialTransaction.findMany({
                where: {
                    companyId: company_constants_1.DEFAULT_COMPANY_ID,
                    deletedAt: null,
                    statementLine: { is: null },
                    ...(bankAccountId
                        ? { OR: [{ bankAccountId }, { bankAccountId: null }] }
                        : {}),
                },
                include: { category: true, bankAccount: true },
                orderBy: { date: 'desc' },
                take: 300,
            }),
            this.listAccounts(),
        ]);
        return {
            accounts: accounts.map((account) => ({
                id: account.id,
                name: account.name,
                institution: account.institution,
                initialBalance: Number(account.initialBalance),
            })),
            lines: lines.map((line) => ({
                id: line.id,
                bankAccountId: line.bankAccountId,
                bankName: line.bankAccount.name,
                postedAt: line.postedAt.toISOString(),
                amount: Number(line.amount),
                description: line.description,
                type: line.type === client_1.TransactionType.INCOME ? 'income' : 'expense',
            })),
            transactions: transactions.map((tx) => ({
                id: tx.id,
                date: tx.date.toISOString(),
                dueDate: tx.dueDate?.toISOString() ?? null,
                description: tx.description,
                amount: Number(tx.amount),
                type: tx.type === client_1.TransactionType.INCOME ? 'income' : 'expense',
                status: tx.status.toLowerCase(),
                categoryName: tx.category?.name ?? 'Sem categoria',
                bankName: tx.bankAccount?.name ?? null,
            })),
        };
    }
    async match(dto) {
        const line = await this.prisma.bankStatementLine.findFirst({
            where: { id: dto.statementLineId, companyId: company_constants_1.DEFAULT_COMPANY_ID },
        });
        if (!line || line.ignored) {
            throw new common_1.NotFoundException('Linha de extrato não encontrada');
        }
        if (line.transactionId) {
            throw new common_1.BadRequestException('Esta linha já está conciliada');
        }
        const transaction = await this.prisma.financialTransaction.findFirst({
            where: {
                id: dto.transactionId,
                companyId: company_constants_1.DEFAULT_COMPANY_ID,
                deletedAt: null,
            },
            include: { statementLine: true },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Lançamento não encontrado');
        }
        if (transaction.statementLine) {
            throw new common_1.BadRequestException('Este lançamento já está conciliado');
        }
        await this.prisma.bankStatementLine.update({
            where: { id: line.id },
            data: { transactionId: transaction.id },
        });
        return { ok: true };
    }
    async ignore(dto) {
        await this.prisma.bankStatementLine.updateMany({
            where: {
                id: { in: dto.ids },
                companyId: company_constants_1.DEFAULT_COMPANY_ID,
                transactionId: null,
            },
            data: { ignored: true },
        });
        return { ok: true };
    }
    async ensureAccount(id) {
        const account = await this.prisma.bankAccount.findFirst({
            where: { id, companyId: company_constants_1.DEFAULT_COMPANY_ID },
        });
        if (!account)
            throw new common_1.NotFoundException('Conta bancária não encontrada');
        return account;
    }
    parseDate(value) {
        const [year, month, day] = value.slice(0, 10).split('-').map(Number);
        return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
    }
};
exports.FinanceBanksService = FinanceBanksService;
exports.FinanceBanksService = FinanceBanksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        finance_service_1.FinanceService])
], FinanceBanksService);
//# sourceMappingURL=finance-banks.service.js.map