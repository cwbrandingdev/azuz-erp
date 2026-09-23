import { PrismaService } from '../prisma/prisma.service';
import { CreateBankAccountDto, IgnoreStatementLinesDto, ImportOfxDto, MatchStatementDto, UpdateBankAccountDto } from './dto/bank.dto';
import { FinanceService } from './finance.service';
export declare class FinanceBanksService {
    private readonly prisma;
    private readonly financeService;
    constructor(prisma: PrismaService, financeService: FinanceService);
    listAccounts(): Promise<{
        id: string;
        name: string;
        institution: string | null;
        initialBalance: number;
    }[]>;
    createAccount(dto: CreateBankAccountDto): Promise<{
        id: string;
        name: string;
        institution: string | null;
        initialBalance: number;
    }>;
    updateAccount(id: string, dto: UpdateBankAccountDto): Promise<{
        id: string;
        name: string;
        institution: string | null;
        initialBalance: number;
    }>;
    deleteAccount(id: string): Promise<void>;
    importOfx(bankAccountId: string, dto: ImportOfxDto): Promise<{
        created: number;
        skipped: number;
    }>;
    getReconciliation(bankAccountId?: string): Promise<{
        accounts: {
            id: string;
            name: string;
            institution: string | null;
            initialBalance: number;
        }[];
        lines: {
            id: string;
            bankAccountId: string;
            bankName: string;
            postedAt: string;
            amount: number;
            description: string;
            type: string;
        }[];
        transactions: {
            id: string;
            date: string;
            dueDate: string | null;
            description: string;
            amount: number;
            type: string;
            status: string;
            categoryName: string;
            bankName: string | null;
        }[];
    }>;
    match(dto: MatchStatementDto): Promise<{
        ok: boolean;
    }>;
    ignore(dto: IgnoreStatementLinesDto): Promise<{
        ok: boolean;
    }>;
    private ensureAccount;
    private parseDate;
}
