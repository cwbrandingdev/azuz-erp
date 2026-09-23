import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class FinanceDailyDigestService {
    private readonly prisma;
    private readonly mail;
    private readonly logger;
    private lastSentDay;
    constructor(prisma: PrismaService, mail: MailService);
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
