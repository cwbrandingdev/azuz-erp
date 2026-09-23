import { TransactionType } from '@prisma/client';
import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateBankAccountDto, IgnoreStatementLinesDto, ImportOfxDto, MatchStatementDto, UpdateBankAccountDto } from './dto/bank.dto';
import { QueryAnnualDreDto, QueryCashFlowStatementDto, QueryDateRangeDto, QueryProjectedCashFlowDto } from './dto/finance-reports.dto';
import { CreateTransactionDto, QueryTransactionsDto, UpdateTransactionDto } from './dto/transaction.dto';
import { BulkImportTransactionsDto } from './dto/import-transactions.dto';
import { QueryFinanceDto } from './dto/query-finance.dto';
import { QueryFinanceCalendarDto } from './dto/query-finance-calendar.dto';
import { FinanceBanksService } from './finance-banks.service';
import { FinanceLegacyService } from './finance-legacy.service';
import { FinanceReportsService } from './finance-reports.service';
import { FinanceService } from './finance.service';
export declare class FinanceController {
    private readonly financeService;
    private readonly financeReportsService;
    private readonly financeBanksService;
    private readonly financeLegacyService;
    constructor(financeService: FinanceService, financeReportsService: FinanceReportsService, financeBanksService: FinanceBanksService, financeLegacyService: FinanceLegacyService);
    getChartOfAccounts(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        name: string;
        code: string | null;
        type: import("@prisma/client").$Enums.TransactionType;
        color: string;
        parentId: string | null;
        dreGroup: import("@prisma/client").$Enums.DreGroup | null;
        cashFlowBlock: import("@prisma/client").$Enums.CashFlowBlock;
        isGroup: boolean;
    }[]>;
    getManagementDashboard(query: QueryDateRangeDto): Promise<{
        period: {
            from: string;
            to: string;
        };
        availableBalance: number;
        banks: {
            id: string;
            name: string;
            balance: number;
        }[];
        unassignedBalance: number;
        overdue: {
            incomeCount: number;
            incomeAmount: number;
            expenseCount: number;
            expenseAmount: number;
        };
        projection: {
            days: number;
            income: number;
            expense: number;
            balance: number;
        }[];
        breakEven: number;
        aboveEquilibrium: boolean;
        profitability: number;
        statement: ({
            label: string;
            amount: number;
            percent: number;
            emphasize?: undefined;
        } | {
            label: string;
            amount: number;
            percent: number;
            emphasize: boolean;
        })[];
        monthly: {
            month: string;
            label: string;
            income: number;
            expense: number;
            result: number;
        }[];
    }>;
    getCashFlowStatement(query: QueryCashFlowStatementDto): Promise<{
        period: {
            from: string;
            to: string;
        };
        blocks: {
            key: import("@prisma/client").$Enums.CashFlowBlock;
            title: string;
            entries: {
                id: string;
                date: string;
                dueDate: string | null;
                description: string;
                type: "income" | "expense";
                status: "paid" | "pending" | "overdue";
                amount: number;
                categoryId: string;
                categoryName: string;
                categoryCode: string | null;
                bankAccountId: string | null;
                bankName: string | null;
            }[];
            income: number;
            expense: number;
            balance: number;
        }[];
        netVariation: number;
    }>;
    getProjectedCashFlow(query: QueryProjectedCashFlowDto): Promise<{
        currentBalance: number;
        days: {
            date: string;
            income: number;
            expense: number;
            balance: number;
            items: {
                id: string;
                date: string;
                dueDate: string | null;
                description: string;
                type: "income" | "expense";
                status: "paid" | "pending" | "overdue";
                amount: number;
                categoryId: string;
                categoryName: string;
                categoryCode: string | null;
                bankAccountId: string | null;
                bankName: string | null;
            }[];
        }[];
    }>;
    getAnnualDre(query: QueryAnnualDreDto): Promise<{
        year: number;
        months: string[];
        sections: {
            rows: {
                categoryId: string;
                code: string | null;
                name: string;
                months: number[];
                total: number;
            }[];
            title: string;
            totals: number[];
            yearTotal: number;
        }[];
        managerialResult: number[];
        finalResult: number[];
        availableBalance: number[];
    }>;
    listBanks(): Promise<{
        id: string;
        name: string;
        institution: string | null;
        initialBalance: number;
    }[]>;
    createBank(dto: CreateBankAccountDto): Promise<{
        id: string;
        name: string;
        institution: string | null;
        initialBalance: number;
    }>;
    updateBank(id: string, dto: UpdateBankAccountDto): Promise<{
        id: string;
        name: string;
        institution: string | null;
        initialBalance: number;
    }>;
    deleteBank(id: string): Promise<void>;
    importOfx(id: string, dto: ImportOfxDto): Promise<{
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
    matchStatement(dto: MatchStatementDto): Promise<{
        ok: boolean;
    }>;
    ignoreStatement(dto: IgnoreStatementLinesDto): Promise<{
        ok: boolean;
    }>;
    getLegacyCategories(type?: TransactionType): Promise<{
        id: string;
        name: string;
        type: string;
        color: string;
    }[]>;
    getLegacyOverview(query: QueryFinanceDto): Promise<{
        recentTransactions: {
            id: string;
            title: string;
            description: string;
            amount: number;
            type: "income" | "expense";
            status: "paid" | "pending" | "overdue";
            date: string;
            dueDate: string | null;
            categoryId: string;
            category: string;
            categoryColor: string;
            clientId: string | null;
            contractId: string | null;
            bankAccountId: null;
            createdAt: string;
        }[];
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        profitMargin: number;
        pendingReceivables: number;
        pendingPayables: number;
        monthlyCashFlow: {
            month: string;
            income: number;
            expense: number;
        }[];
        expenseByCategory: {
            categoryId: string;
            categoryName: string;
            amount: number;
            color: string;
        }[];
        period: {
            month: number | null;
            year: number;
        };
    }>;
    getLegacyTransactions(query: QueryTransactionsDto): Promise<{
        data: {
            id: string;
            title: string;
            description: string;
            amount: number;
            type: "income" | "expense";
            status: "paid" | "pending" | "overdue";
            date: string;
            dueDate: string | null;
            categoryId: string;
            category: string;
            categoryColor: string;
            clientId: string | null;
            contractId: string | null;
            bankAccountId: null;
            createdAt: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getOverview(user: AuthenticatedUser, query: QueryFinanceDto): Promise<{
        recentTransactions: {
            id: string;
            title: string;
            description: string;
            amount: number;
            type: "income" | "expense";
            status: "paid" | "pending" | "overdue";
            date: string;
            dueDate: string | null;
            categoryId: string;
            category: string;
            categoryColor: string;
            clientId: string | null;
            contractId: string | null;
            bankAccountId: string | null;
            createdAt: string;
        }[];
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        profitMargin: number;
        pendingReceivables: number;
        pendingPayables: number;
        monthlyCashFlow: {
            month: string;
            income: number;
            expense: number;
        }[];
        expenseByCategory: {
            categoryId: string;
            categoryName: string;
            amount: number;
            color: string;
        }[];
        period: {
            month: number | null;
            year: number;
        };
    }>;
    getCashFlow(user: AuthenticatedUser, query: QueryFinanceDto): Promise<{
        totalRevenue: number;
        totalExpenses: number;
        netProfit: number;
        profitMargin: number;
        pendingReceivables: number;
        pendingPayables: number;
        monthlyCashFlow: {
            month: string;
            income: number;
            expense: number;
        }[];
        expenseByCategory: {
            categoryId: string;
            categoryName: string;
            amount: number;
            color: string;
        }[];
        period: {
            month: number | null;
            year: number;
        };
    }>;
    getCalendar(user: AuthenticatedUser, query: QueryFinanceCalendarDto): Promise<{
        period: {
            startDate: string;
            endDate: string;
        };
        days: {
            date: string;
            income: {
                id: string;
                title: string;
                description: string;
                amount: number;
                type: "income" | "expense";
                status: "paid" | "pending" | "overdue";
                scheduledDate: string;
                date: string;
                dueDate: string | null;
                categoryId: string;
                category: string;
                categoryColor: string;
                clientId: string | null;
            }[];
            expense: {
                id: string;
                title: string;
                description: string;
                amount: number;
                type: "income" | "expense";
                status: "paid" | "pending" | "overdue";
                scheduledDate: string;
                date: string;
                dueDate: string | null;
                categoryId: string;
                category: string;
                categoryColor: string;
                clientId: string | null;
            }[];
            totals: {
                income: number;
                expense: number;
                net: number;
            };
        }[];
        byDate: {
            [k: string]: {
                income: {
                    id: string;
                    title: string;
                    description: string;
                    amount: number;
                    type: "income" | "expense";
                    status: "paid" | "pending" | "overdue";
                    scheduledDate: string;
                    date: string;
                    dueDate: string | null;
                    categoryId: string;
                    category: string;
                    categoryColor: string;
                    clientId: string | null;
                }[];
                expense: {
                    id: string;
                    title: string;
                    description: string;
                    amount: number;
                    type: "income" | "expense";
                    status: "paid" | "pending" | "overdue";
                    scheduledDate: string;
                    date: string;
                    dueDate: string | null;
                    categoryId: string;
                    category: string;
                    categoryColor: string;
                    clientId: string | null;
                }[];
                totals: {
                    income: number;
                    expense: number;
                    net: number;
                };
            };
        };
        totals: {
            income: number;
            expense: number;
            net: number;
            transactionCount: number;
        };
    }>;
    getCategories(type?: TransactionType): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        name: string;
        code: string | null;
        type: import("@prisma/client").$Enums.TransactionType;
        color: string;
        parentId: string | null;
        dreGroup: import("@prisma/client").$Enums.DreGroup | null;
        cashFlowBlock: import("@prisma/client").$Enums.CashFlowBlock;
        isGroup: boolean;
    }[]>;
    createCategory(dto: CreateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        name: string;
        code: string | null;
        type: import("@prisma/client").$Enums.TransactionType;
        color: string;
        parentId: string | null;
        dreGroup: import("@prisma/client").$Enums.DreGroup | null;
        cashFlowBlock: import("@prisma/client").$Enums.CashFlowBlock;
        isGroup: boolean;
    }>;
    updateCategory(id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        name: string;
        code: string | null;
        type: import("@prisma/client").$Enums.TransactionType;
        color: string;
        parentId: string | null;
        dreGroup: import("@prisma/client").$Enums.DreGroup | null;
        cashFlowBlock: import("@prisma/client").$Enums.CashFlowBlock;
        isGroup: boolean;
    }>;
    deleteCategory(id: string): Promise<void>;
    getTransactions(user: AuthenticatedUser, query: QueryTransactionsDto): Promise<{
        data: {
            id: string;
            title: string;
            description: string;
            amount: number;
            type: "income" | "expense";
            status: "paid" | "pending" | "overdue";
            date: string;
            dueDate: string | null;
            categoryId: string;
            category: string;
            categoryColor: string;
            clientId: string | null;
            contractId: string | null;
            bankAccountId: string | null;
            createdAt: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    importTransactions(user: AuthenticatedUser, dto: BulkImportTransactionsDto): Promise<{
        created: number;
        errors: {
            index: number;
            message: string;
        }[];
        transactions: {
            id: string;
            title: string;
            description: string;
            amount: number;
            type: "income" | "expense";
            status: "paid" | "pending" | "overdue";
            date: string;
            dueDate: string | null;
            categoryId: string;
            category: string;
            categoryColor: string;
            clientId: string | null;
            contractId: string | null;
            bankAccountId: string | null;
            createdAt: string;
        }[];
    }>;
    createTransaction(user: AuthenticatedUser, dto: CreateTransactionDto): Promise<{
        id: string;
        title: string;
        description: string;
        amount: number;
        type: "income" | "expense";
        status: "paid" | "pending" | "overdue";
        date: string;
        dueDate: string | null;
        categoryId: string;
        category: string;
        categoryColor: string;
        clientId: string | null;
        contractId: string | null;
        bankAccountId: string | null;
        createdAt: string;
    }>;
    updateTransaction(user: AuthenticatedUser, id: string, dto: UpdateTransactionDto): Promise<{
        id: string;
        title: string;
        description: string;
        amount: number;
        type: "income" | "expense";
        status: "paid" | "pending" | "overdue";
        date: string;
        dueDate: string | null;
        categoryId: string;
        category: string;
        categoryColor: string;
        clientId: string | null;
        contractId: string | null;
        bankAccountId: string | null;
        createdAt: string;
    }>;
    deleteTransaction(user: AuthenticatedUser, id: string): Promise<void>;
}
