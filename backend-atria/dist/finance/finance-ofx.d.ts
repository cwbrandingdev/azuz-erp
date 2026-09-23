import { TransactionType } from '@prisma/client';
export type ParsedOfxTransaction = {
    fitId: string;
    postedAt: string;
    amount: number;
    description: string;
    type: TransactionType;
};
export declare function parseOfx(content: string): ParsedOfxTransaction[];
