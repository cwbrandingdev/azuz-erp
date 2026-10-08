import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PortalService } from '../portal/portal.service';
import { GenerateReportDto, QueryReportsDto } from './dto/report.dto';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    private readonly portalService;
    constructor(reportsService: ReportsService, portalService: PortalService);
    findAll(query: QueryReportsDto): Promise<{
        id: string;
        clientId: string;
        client: {
            id: string;
            companyName: string;
            contactName: string | null;
            email: string | null;
            instagram: string | null;
            avatarUrl: string | null;
        };
        month: number;
        year: number;
        title: string;
        data: import("@prisma/client/runtime/library").JsonValue;
        generatedBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
        };
        createdAt: string;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        clientId: string;
        client: {
            id: string;
            companyName: string;
            contactName: string | null;
            email: string | null;
            instagram: string | null;
            avatarUrl: string | null;
        };
        month: number;
        year: number;
        title: string;
        data: import("@prisma/client/runtime/library").JsonValue;
        generatedBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
        };
        createdAt: string;
    }>;
    generate(user: AuthenticatedUser, clientId: string, dto: GenerateReportDto): Promise<{
        id: string;
        clientId: string;
        client: {
            id: string;
            companyName: string;
            contactName: string | null;
            email: string | null;
            instagram: string | null;
            avatarUrl: string | null;
        };
        month: number;
        year: number;
        title: string;
        data: import("@prisma/client/runtime/library").JsonValue;
        generatedBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
        };
        createdAt: string;
    }>;
    generatePortalToken(clientId: string): Promise<{
        clientId: string;
        companyName: string;
        token: string;
        portalUrl: string;
    }>;
}
