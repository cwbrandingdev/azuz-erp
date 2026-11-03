import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { LeadsService } from '../leads/leads.service';
import { ProspectingLeadsQueryDto } from './dto/prospecting-leads-query.dto';
import { UpdateCrmReminderDto } from './dto/update-crm-reminder.dto';
export declare class CrmRemindersController {
    private readonly leadsService;
    constructor(leadsService: LeadsService);
    findBoard(user: AuthenticatedUser, query: ProspectingLeadsQueryDto): Promise<{
        columns: ({
            tasks: {
                id: string;
                companyId: string;
                leadId: string;
                title: string;
                dueDate: string;
                status: string;
                completedAt: string | null;
                lead: {
                    id: string;
                    name: string;
                    phone: string | null;
                    email: string | null;
                } | null;
                createdAt: string;
                updatedAt: string;
            }[];
            status: "PENDING";
            title: "A fazer";
        } | {
            tasks: {
                id: string;
                companyId: string;
                leadId: string;
                title: string;
                dueDate: string;
                status: string;
                completedAt: string | null;
                lead: {
                    id: string;
                    name: string;
                    phone: string | null;
                    email: string | null;
                } | null;
                createdAt: string;
                updatedAt: string;
            }[];
            status: "DONE";
            title: "Concluído";
        } | {
            tasks: {
                id: string;
                companyId: string;
                leadId: string;
                title: string;
                dueDate: string;
                status: string;
                completedAt: string | null;
                lead: {
                    id: string;
                    name: string;
                    phone: string | null;
                    email: string | null;
                } | null;
                createdAt: string;
                updatedAt: string;
            }[];
            status: "CANCELLED";
            title: "Cancelado";
        })[];
        total: number;
    }>;
    updateStatus(user: AuthenticatedUser, id: string, dto: UpdateCrmReminderDto): Promise<{
        id: string;
        companyId: string;
        leadId: string;
        title: string;
        dueDate: string;
        status: string;
        completedAt: string | null;
        lead: {
            id: string;
            name: string;
            phone: string | null;
            email: string | null;
        } | null;
        createdAt: string;
        updatedAt: string;
    }>;
}
