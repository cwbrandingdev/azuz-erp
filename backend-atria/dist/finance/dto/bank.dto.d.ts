export declare class CreateBankAccountDto {
    name: string;
    institution?: string;
    initialBalance?: number;
}
export declare class UpdateBankAccountDto {
    name?: string;
    institution?: string;
    initialBalance?: number;
}
export declare class ImportOfxDto {
    content: string;
}
export declare class MatchStatementDto {
    statementLineId: string;
    transactionId: string;
}
export declare class IgnoreStatementLinesDto {
    ids: string[];
}
