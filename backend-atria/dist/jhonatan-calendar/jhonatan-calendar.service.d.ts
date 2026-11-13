import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJhonatanCalendarDto, QueryJhonatanCalendarDto } from './dto/jhonatan-calendar.dto';
export declare class JhonatanCalendarService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(user: AuthenticatedUser, query: QueryJhonatanCalendarDto): Promise<{
        id: string;
        title: string;
        contactName: string;
        briefing: string | null;
        leadId: string | null;
        leadName: string | null;
        startAt: string;
        endAt: string;
        createdById: string;
        createdByName: string;
    }[]>;
    create(user: AuthenticatedUser, dto: CreateJhonatanCalendarDto): Promise<{
        id: string;
        title: string;
        contactName: string;
        briefing: string | null;
        leadId: string | null;
        leadName: string | null;
        startAt: string;
        endAt: string;
        createdById: string;
        createdByName: string;
    }>;
    remove(user: AuthenticatedUser, id: string): Promise<void>;
}
