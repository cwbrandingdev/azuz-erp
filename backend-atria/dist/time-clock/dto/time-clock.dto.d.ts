import { TimeClockEntryType } from '@prisma/client';
export declare class PunchTimeClockDto {
    type: TimeClockEntryType;
}
export declare class TimeClockRangeQueryDto {
    from?: string;
    to?: string;
}
export declare class TimeClockListQueryDto extends TimeClockRangeQueryDto {
    userId?: string;
}
export declare class CreateManualTimeClockEntryDto {
    userId: string;
    type: TimeClockEntryType;
    punchedAt: string;
    note: string;
}
export declare class UpdateTimeClockEntryDto {
    type?: TimeClockEntryType;
    punchedAt?: string;
    note: string;
}
