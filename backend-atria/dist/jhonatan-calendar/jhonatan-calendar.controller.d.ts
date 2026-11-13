import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateJhonatanCalendarDto, QueryJhonatanCalendarDto } from './dto/jhonatan-calendar.dto';
import { JhonatanCalendarService } from './jhonatan-calendar.service';
export declare class JhonatanCalendarController {
    private readonly jhonatanCalendarService;
    constructor(jhonatanCalendarService: JhonatanCalendarService);
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
