import { TransactionStatus, TransactionType } from '@prisma/client';
export declare class QueryDateRangeDto {
    from?: string;
    to?: string;
    chartYear?: number;
}
export declare class QueryCashFlowStatementDto extends QueryDateRangeDto {
    type?: TransactionType;
    categoryId?: string;
    bankAccountId?: string;
    status?: TransactionStatus;
    search?: string;
}
export declare class QueryProjectedCashFlowDto {
    to?: string;
    type?: TransactionType;
}
export declare class QueryAnnualDreDto {
    year?: number;
}
