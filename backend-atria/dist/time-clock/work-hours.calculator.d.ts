import { TimeClockEntryType } from '@prisma/client';
export interface TimeClockPunch {
    type: TimeClockEntryType;
    punchedAt: Date;
}
export interface WorkDaySummary<T extends TimeClockPunch> {
    date: string;
    workedMinutes: number;
    breakMinutes: number;
    isOpen: boolean;
    entries: T[];
}
export declare class WorkHoursCalculator {
    allowedTypes(dayEntries: TimeClockPunch[]): TimeClockEntryType[];
    summarizeByDay<T extends TimeClockPunch>(entries: T[], now?: Date): WorkDaySummary<T>[];
    totalMinutes(days: WorkDaySummary<TimeClockPunch>[]): number;
    private summarizeDay;
    private elapsedSince;
}
