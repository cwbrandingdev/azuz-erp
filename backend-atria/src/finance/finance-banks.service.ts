import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBankAccountDto,
  IgnoreStatementLinesDto,
  ImportOfxDto,
  MatchStatementDto,
  UpdateBankAccountDto,
} from './dto/bank.dto';
import { FinanceService } from './finance.service';
import { parseOfx } from './finance-ofx';

@Injectable()
export class FinanceBanksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceService,
  ) {}

  async listAccounts() {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { companyId: DEFAULT_COMPANY_ID },
      orderBy: { name: 'asc' },
    });

    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      institution: account.institution,
      initialBalance: Number(account.initialBalance),
    }));
  }

  async createAccount(dto: CreateBankAccountDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.bankAccount.findFirst({
      where: {
        companyId: DEFAULT_COMPANY_ID,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing) {
      throw new BadRequestException('Já existe uma conta com este nome');
    }

    const account = await this.prisma.bankAccount.create({
      data: {
        companyId: DEFAULT_COMPANY_ID,
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

  async updateAccount(id: string, dto: UpdateBankAccountDto) {
    await this.ensureAccount(id);
    const account = await this.prisma.bankAccount.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        institution:
          dto.institution === undefined ? undefined : dto.institution.trim() || null,
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

  async deleteAccount(id: string) {
    await this.ensureAccount(id);
    const [transactions, lines] = await Promise.all([
      this.prisma.financialTransaction.count({
        where: { bankAccountId: id, deletedAt: null },
      }),
      this.prisma.bankStatementLine.count({ where: { bankAccountId: id } }),
    ]);
    if (transactions > 0 || lines > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma conta com lançamentos ou extrato',
      );
    }
    await this.prisma.bankAccount.delete({ where: { id } });
  }

  async importOfx(bankAccountId: string, dto: ImportOfxDto) {
    await this.ensureAccount(bankAccountId);
    const parsed = parseOfx(dto.content);
    if (parsed.length === 0) {
      throw new BadRequestException('Nenhum lançamento encontrado no OFX');
    }

    let created = 0;
    let skipped = 0;

    const seen = new Set<string>();

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
          companyId: DEFAULT_COMPANY_ID,
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

  async getReconciliation(bankAccountId?: string) {
    await this.financeService.ensureChartOfAccounts();
    const lineWhere: Prisma.BankStatementLineWhereInput = {
      companyId: DEFAULT_COMPANY_ID,
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
          companyId: DEFAULT_COMPANY_ID,
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
        type: line.type === TransactionType.INCOME ? 'income' : 'expense',
      })),
      transactions: transactions.map((tx) => ({
        id: tx.id,
        date: tx.date.toISOString(),
        dueDate: tx.dueDate?.toISOString() ?? null,
        description: tx.description,
        amount: Number(tx.amount),
        type: tx.type === TransactionType.INCOME ? 'income' : 'expense',
        status: tx.status.toLowerCase(),
        categoryName: tx.category?.name ?? 'Sem categoria',
        bankName: tx.bankAccount?.name ?? null,
      })),
    };
  }

  async match(dto: MatchStatementDto) {
    const line = await this.prisma.bankStatementLine.findFirst({
      where: { id: dto.statementLineId, companyId: DEFAULT_COMPANY_ID },
    });
    if (!line || line.ignored) {
      throw new NotFoundException('Linha de extrato não encontrada');
    }
    if (line.transactionId) {
      throw new BadRequestException('Esta linha já está conciliada');
    }

    const transaction = await this.prisma.financialTransaction.findFirst({
      where: {
        id: dto.transactionId,
        companyId: DEFAULT_COMPANY_ID,
        deletedAt: null,
      },
      include: { statementLine: true },
    });
    if (!transaction) {
      throw new NotFoundException('Lançamento não encontrado');
    }
    if (transaction.statementLine) {
      throw new BadRequestException('Este lançamento já está conciliado');
    }

    await this.prisma.bankStatementLine.update({
      where: { id: line.id },
      data: { transactionId: transaction.id },
    });

    return { ok: true };
  }

  async ignore(dto: IgnoreStatementLinesDto) {
    await this.prisma.bankStatementLine.updateMany({
      where: {
        id: { in: dto.ids },
        companyId: DEFAULT_COMPANY_ID,
        transactionId: null,
      },
      data: { ignored: true },
    });
    return { ok: true };
  }

  private async ensureAccount(id: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, companyId: DEFAULT_COMPANY_ID },
    });
    if (!account) throw new NotFoundException('Conta bancária não encontrada');
    return account;
  }

  private parseDate(value: string) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
  }
}
