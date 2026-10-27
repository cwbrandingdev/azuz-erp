import { TimeClockEntryType } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManualTimeClockEntryDto, TimeClockListQueryDto, TimeClockRangeQueryDto, UpdateTimeClockEntryDto } from './dto/time-clock.dto';
import type { PunchContext } from './punch-context';
import { WorkHoursCalculator, type WorkDaySummary } from './work-hours.calculator';
export type TimeClockStatus = 'WORKING' | 'ON_BREAK' | 'OFF';
export interface DateRange {
    from: string;
    to: string;
}
export declare class TimeClockService {
    private readonly prisma;
    private readonly calculator;
    constructor(prisma: PrismaService, calculator: WorkHoursCalculator);
    punch(user: AuthenticatedUser, type: TimeClockEntryType, context: PunchContext): Promise<{
        userId: string;
        id: string;
        createdBy: {
            id: string;
            name: string;
        } | null;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.TimeClockEntryType;
        note: string | null;
        punchedAt: Date;
        isManual: boolean;
        updatedBy: {
            id: string;
            name: string;
        } | null;
    }>;
    getMine(user: AuthenticatedUser, query: TimeClockRangeQueryDto): Promise<{
        range: DateRange;
        allowedTypes: import("@prisma/client").$Enums.TimeClockEntryType[];
        totalMinutes: number;
        days: WorkDaySummary<{
            userId: string;
            id: string;
            createdBy: {
                id: string;
                name: string;
            } | null;
            createdAt: Date;
            updatedAt: Date;
            type: import("@prisma/client").$Enums.TimeClockEntryType;
            note: string | null;
            punchedAt: Date;
            isManual: boolean;
            updatedBy: {
                id: string;
                name: string;
            } | null;
        }>[];
    }>;
    list(user: AuthenticatedUser, query: TimeClockListQueryDto): Promise<{
        range: DateRange;
        users: {
            user: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
            totalMinutes: number;
            status: TimeClockStatus;
            days: WorkDaySummary<{
                userId: string;
                id: string;
                createdBy: {
                    id: string;
                    name: string;
                } | null;
                createdAt: Date;
                updatedAt: Date;
                type: import("@prisma/client").$Enums.TimeClockEntryType;
                note: string | null;
                punchedAt: Date;
                isManual: boolean;
                updatedBy: {
                    id: string;
                    name: string;
                } | null;
            }>[];
        }[];
    }>;
    createManual(admin: AuthenticatedUser, dto: CreateManualTimeClockEntryDto): Promise<{
        userId: string;
        id: string;
        createdBy: {
            id: string;
            name: string;
        } | null;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.TimeClockEntryType;
        note: string | null;
        punchedAt: Date;
        isManual: boolean;
        updatedBy: {
            id: string;
            name: string;
        } | null;
    }>;
    update(admin: AuthenticatedUser, entryId: string, dto: UpdateTimeClockEntryDto): Promise<{
        userId: string;
        id: string;
        createdBy: {
            id: string;
            name: string;
        } | null;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.TimeClockEntryType;
        note: string | null;
        punchedAt: Date;
        isManual: boolean;
        updatedBy: {
            id: string;
            name: string;
        } | null;
    }>;
    private findEntries;
    private currentStatus;
    private groupByUser;
    private resolveRange;
    private singleDayRange;
    private parsePastDate;
    private assertMemberOfCompany;
    private requireMemberCompany;
    private requireCompany;
}
