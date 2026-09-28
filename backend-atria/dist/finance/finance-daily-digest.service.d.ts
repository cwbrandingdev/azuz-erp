import { OnModuleInit } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class FinanceDailyDigestService implements OnModuleInit {
    private readonly prisma;
    private readonly mail;
    private readonly logger;
    private logTableReady;
    constructor(prisma: PrismaService, mail: MailService);
    onModuleInit(): Promise<void>;
    handleDailyAccountsEmail(): Promise<{
        sent: number;
        companies: number;
    }>;
    sendDailyAccountsEmail(day?: {
        iso: string;
        label: string;
        start: Date;
        end: Date;
    }): Promise<{
        sent: number;
        companies: number;
    }>;
    private wasSent;
    private markSent;
    private ensureLogTable;
    private loadTodayLines;
    private buildWorkbook;
    private buildText;
    private buildHtml;
    private sectionHtml;
    private totals;
    private saoPauloDay;
    private calendarDay;
    private formatStoredDate;
    private accountLabel;
    private money;
    private round;
    private escape;
}
