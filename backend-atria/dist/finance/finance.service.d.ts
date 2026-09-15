import { Contract, Client, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { BulkImportTransactionsDto } from './dto/import-transactions.dto';
import { CreateTransactionDto, QueryTransactionsDto, UpdateTransactionDto } from './dto/transaction.dto';
import { QueryFinanceDto } from './dto/query-finance.dto';
import { QueryFinanceCalendarDto } from './dto/query-finance-calendar.dto';
type FinancePeriodOptions = Pick<QueryFinanceDto, 'month' | 'year'>;
export declare class FinanceService {
    private readonly prisma;
    private static readonly CASH_FLOW_STATUSES;
    private static readonly PENDING_ALERT_STATUSES;
    constructor(prisma: PrismaService);
    private activeTransactionWhere;
    private activeTransactionScope;
    getCategories(type?: TransactionType): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        name: string;
        type: import("@prisma/client").$Enums.TransactionType;
        color: string;
    }[]>;
    createCategory(dto: CreateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        name: string;
        type: import("@prisma/client").$Enums.TransactionType;
        color: string;
    }>;
    updateCategory(id: string, dto: UpdateCategoryDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        name: string;
        type: import("@prisma/client").$Enums.TransactionType;
        color: string;
    }>;
    deleteCategory(id: string): Promise<void>;
    getCashFlow(userId: string, period?: FinancePeriodOptions): Promise<{
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
    getFinancialCalendar(userId: string, query?: QueryFinanceCalendarDto): Promise<{
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
    getOverview(userId: string, period?: FinancePeriodOptions): Promise<{
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
    getTransactions(userId: string, query: QueryTransactionsDto): Promise<{
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
            createdAt: string;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    generateSalaryExpensesForEmployee(input: {
        createdByUserId: string;
        employeeName: string;
        monthlySalary: number;
        months?: number;
    }): Promise<{
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
        createdAt: string;
    }>;
    createTransaction(userId: string, dto: CreateTransactionDto): Promise<{
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
        createdAt: string;
    }>;
    updateTransaction(userId: string, id: string, dto: UpdateTransactionDto): Promise<{
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
        createdAt: string;
    }>;
    deleteTransaction(userId: string, id: string): Promise<void>;
    bulkImportTransactions(userId: string, dto: BulkImportTransactionsDto): Promise<{
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
            createdAt: string;
        }[];
    }>;
    generateReceivablesFromContract(userId: string, contract: Contract & {
        client: Client;
    }): Promise<{
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
        createdAt: string;
    }[]>;
    private resolveIncomeCategory;
    private buildPaymentSchedule;
    private resolveStatus;
    private parseDateOnly;
    private normalizeCategoryName;
    private resolveImportCategory;
    private ensureImportCategory;
    private parseRangeStart;
    private parseRangeEnd;
    private resolveCalendarPeriod;
    private buildCalendarDayBuckets;
    private formatCalendarDateKey;
    private toCalendarTransaction;
    private ensureCategoryExists;
    private validateCategoryType;
    private ensureClientExists;
    private findUserTransaction;
    private toTransactionResponse;
    getDueTodayAlerts(userId: string): Promise<{
        dueToday: {
            client: {
                id: string;
                companyName: string;
                contactName: string | null;
                email: string | null;
            } | null;
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
            createdAt: string;
        }[];
        overdue: {
            client: {
                id: string;
                companyName: string;
                contactName: string | null;
                email: string | null;
            } | null;
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
            createdAt: string;
        }[];
        alerts: {
            client: {
                id: string;
                companyName: string;
                contactName: string | null;
                email: string | null;
            } | null;
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
            createdAt: string;
        }[];
        totals: {
            dueTodayCount: number;
            overdueCount: number;
            dueTodayAmount: number;
            overdueAmount: number;
        };
    }>;
    getMonthlyCashflow(userId: string, period?: FinancePeriodOptions): Promise<{
        income: {
            categoryId: string;
            categoryName: string;
            amount: number;
            color: string;
        }[];
        expense: {
            categoryId: string;
            categoryName: string;
            amount: number;
            color: string;
        }[];
        expenseByCategory: {
            categoryId: string;
            categoryName: string;
            amount: number;
            color: string;
        }[];
        monthlyCashFlow: {
            month: string;
            income: number;
            expense: number;
        }[];
        period: {
            month: number | null;
            year: number;
        };
    }>;
    getClientFinances(clientId: string): Promise<{
        clientId: string;
        pending: {
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
            createdAt: string;
        }[];
        paid: {
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
            createdAt: string;
        }[];
        overdue: {
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
            createdAt: string;
        }[];
        invoices: {
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
            createdAt: string;
        }[];
        totals: {
            totalDue: number;
            totalPaid: number;
            totalOverdue: number;
            pendingCount: number;
            paidCount: number;
            overdueCount: number;
        };
    }>;
}
export {};
