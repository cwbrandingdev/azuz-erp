import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
type TaskMailContext = {
    companyId: string;
    taskId: string;
    taskTitle: string;
    actorId?: string | null;
    reason?: string | null;
};
export declare class NotificationsService {
    private readonly prisma;
    private readonly config;
    private readonly mail;
    private readonly logger;
    constructor(prisma: PrismaService, config: ConfigService, mail: MailService);
    findAll(userId: string, unreadOnly?: boolean): Promise<{
        id: string;
        userId: string;
        title: string;
        message: string;
        type: string;
        isRead: boolean;
        taskId: string | null;
        appUpdateId: string | null;
        createdAt: string;
    }[]>;
    getUnreadCount(userId: string): Promise<number>;
    markAsRead(userId: string, id: string): Promise<{
        id: string;
        userId: string;
        title: string;
        message: string;
        type: string;
        isRead: boolean;
        taskId: string | null;
        appUpdateId: string | null;
        createdAt: string;
    }>;
    markAllAsRead(userId: string): Promise<{
        success: boolean;
    }>;
    notifyTaskAssigned(assigneeIds: string[], taskTitle: string, actorId: string, options?: {
        companyId?: string;
        taskId?: string;
    }): Promise<void>;
    notifyInternalApprovalPending(input: TaskMailContext): Promise<void>;
    notifyTaskReproved(input: TaskMailContext): Promise<void>;
    notifyContractSigned(userIds: string[], contractTitle: string, clientName: string): Promise<void>;
    notifyPostPending(userIds: string[], postTitle: string, clientName: string): Promise<void>;
    notifyPostRejected(userIds: string[], postTitle: string, clientName: string, reason: string): Promise<void>;
    notifyNewRequest(userIds: string[], requestTitle: string, clientName: string, options?: {
        companyId?: string;
    }): Promise<void>;
    notifyDueDateWarning(userIds: string[], taskTitle: string, overdue: boolean, options: {
        companyId: string;
        taskId: string;
    }): Promise<void>;
    notifyNewLeadInKanban(userIds: string[], leadName: string, options?: {
        companyId?: string;
    }): Promise<void>;
    notifyAppUpdate(userIds: string[], updateTitle: string, options?: {
        companyId?: string;
        appUpdateId?: string;
    }): Promise<void>;
    getAppUpdateUnreadCount(userId: string): Promise<number>;
    markAppUpdateNotificationAsRead(userId: string, appUpdateId: string): Promise<{
        success: boolean;
    }>;
    markAppUpdateNotificationsAsRead(userId: string): Promise<{
        success: boolean;
    }>;
    createMany(userIds: string[], type: NotificationType, title: string, message: string, extra?: {
        companyId?: string;
        taskId?: string;
        appUpdateId?: string;
    }): Promise<void>;
    private findDesignerRecipients;
    private sendTaskMail;
    private buildTaskHtml;
    private loadTaskMailDetails;
    private formatDate;
    private buildTaskLink;
    private buildAppLink;
    private resolveAppUrl;
    private escapeHtml;
    private toResponse;
}
export {};
