import { TransactionType } from '@prisma/client';
import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateTransactionDto, QueryTransactionsDto, UpdateTransactionDto } from './dto/transaction.dto';
import { BulkImportTransactionsDto } from './dto/import-transactions.dto';
import { QueryFinanceDto } from './dto/query-finance.dto';
import { QueryFinanceCalendarDto } from './dto/query-finance-calendar.dto';
import { FinanceService } from './finance.service';
export declare class FinanceController {
    private readonly financeService;
    constructor(financeService: FinanceService);
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
        createdAt: string;
    }>;
    deleteTransaction(user: AuthenticatedUser, id: string): Promise<void>;
}
