export declare function compareChartAccountCodes(left: string | null | undefined, right: string | null | undefined, leftFallback?: string, rightFallback?: string): number;
export declare function compareChartAccounts<T extends {
    code: string | null;
    name: string;
}>(left: T, right: T): number;
