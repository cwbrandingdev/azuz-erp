import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { QueryFinanceDto } from './dto/query-finance.dto';
import { FinanceService } from './finance.service';
export declare class FinancesApiController {
    private readonly financeService;
    constructor(financeService: FinanceService);
    getDueTodayAlerts(user: AuthenticatedUser): Promise<{
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
            bankAccountId: string | null;
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
            bankAccountId: string | null;
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
            bankAccountId: string | null;
            createdAt: string;
        }[];
        totals: {
            dueTodayCount: number;
            overdueCount: number;
            dueTodayAmount: number;
            overdueAmount: number;
        };
    }>;
    getMonthlyCashflow(user: AuthenticatedUser, query: QueryFinanceDto): Promise<{
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
}
