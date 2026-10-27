import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class TimeClockRemindersService {
    private readonly prisma;
    private readonly notifications;
    private readonly logger;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    remindClockIn(): Promise<void>;
    remindLunchReturn(): Promise<void>;
    remindClockOut(): Promise<void>;
    private remind;
    private findActiveUsers;
    private findTodayLastPunches;
    private excludeAlreadyReminded;
    private send;
}
