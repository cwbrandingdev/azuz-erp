import { PrismaService } from '../prisma/prisma.service';
import { QueryAnnualDreDto, QueryCashFlowStatementDto, QueryDateRangeDto, QueryProjectedCashFlowDto } from './dto/finance-reports.dto';
import { FinanceService } from './finance.service';
export declare class FinanceReportsService {
    private readonly prisma;
    private readonly financeService;
    constructor(prisma: PrismaService, financeService: FinanceService);
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
    private section;
    private toEntry;
}
