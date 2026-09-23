import { PrismaService } from '../prisma/prisma.service';
import { QueryFinanceDto } from './dto/query-finance.dto';
import { QueryTransactionsDto } from './dto/transaction.dto';
export declare class FinanceLegacyService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getCategories(type?: string): Promise<{
        id: string;
        name: string;
        type: string;
        color: string;
    }[]>;
    getOverview(period?: Pick<QueryFinanceDto, 'month' | 'year'>): Promise<{
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
    getTransactions(query: QueryTransactionsDto): Promise<{
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
    private getCashFlow;
    private loadRows;
    private toResponse;
    private compare;
    private parseStart;
    private parseEnd;
}
