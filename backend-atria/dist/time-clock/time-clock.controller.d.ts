import type { Request } from 'express';
import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateManualTimeClockEntryDto, PunchTimeClockDto, TimeClockListQueryDto, TimeClockRangeQueryDto, UpdateTimeClockEntryDto } from './dto/time-clock.dto';
import { TimeClockService } from './time-clock.service';
export declare class TimeClockController {
    private readonly timeClockService;
    constructor(timeClockService: TimeClockService);
    punch(user: AuthenticatedUser, dto: PunchTimeClockDto, request: Request): Promise<{
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
        range: import("./time-clock.service").DateRange;
        allowedTypes: import("@prisma/client").$Enums.TimeClockEntryType[];
        totalMinutes: number;
        days: import("./work-hours.calculator").WorkDaySummary<{
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
        range: import("./time-clock.service").DateRange;
        users: {
            user: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
            totalMinutes: number;
            status: import("./time-clock.service").TimeClockStatus;
            days: import("./work-hours.calculator").WorkDaySummary<{
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
    createManual(user: AuthenticatedUser, dto: CreateManualTimeClockEntryDto): Promise<{
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
    update(user: AuthenticatedUser, id: string, dto: UpdateTimeClockEntryDto): Promise<{
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
}
