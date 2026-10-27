export declare const SAO_PAULO_TZ = "America/Sao_Paulo";
export declare function toSaoPauloDayKey(date: Date): string;
export declare function startOfSaoPauloDay(dayKey: string): Date;
export declare function endOfSaoPauloDayExclusive(dayKey: string): Date;
export declare function daysBetween(fromKey: string, toKey: string): number;
export declare function currentMonthRange(now?: Date): {
    from: string;
    to: string;
};
