export interface InstagramInsightsPeriod {
    month: number;
    year: number;
    since: number;
    until: number;
    label: string;
}
export interface InstagramInsightsGraphWindow {
    since: number;
    until: number;
    available: boolean;
    partial: boolean;
}
export declare const ACCOUNT_LOOKBACK_SECONDS: number;
export declare function currentBrazilPeriod(now?: Date): {
    month: number;
    year: number;
};
export declare function resolveInsightsPeriod(month?: number, year?: number, now?: Date): InstagramInsightsPeriod;
export declare function isTimestampInPeriod(timestamp: string | null | undefined, since: number, until: number): boolean;
export declare function intersectWithLookback(period: InstagramInsightsPeriod, now?: Date): InstagramInsightsGraphWindow;
