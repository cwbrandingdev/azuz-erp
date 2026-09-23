import { Prisma, PrismaClient } from '@prisma/client';
export declare const EXPENSE_CATEGORY_NAMES: readonly [];
export declare const DEFAULT_FINANCIAL_CATEGORIES: readonly [{
    readonly name: "RECEITAS";
    readonly type: "INCOME";
    readonly color: "#10B981";
}, ...{
    name: never;
    type: "EXPENSE";
    color: never;
}[]];
type FinanceDb = PrismaClient | Prisma.TransactionClient;
export declare function syncFinancialCategories(prisma: FinanceDb, companyId: string): Promise<void>;
export declare function seedDefaultFinancialCategories(prisma: FinanceDb, companyId: string): Promise<void>;
export {};
