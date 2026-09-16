import { ImportLeadMinerLeadsDto } from './dto/import-leads.dto';
import type { SearchLeadsDTO } from './dto/search-leads.dto';
import { LeadminerService } from './leadminer.service';
export declare class LeadMinerController {
    private readonly leadMinerService;
    constructor(leadMinerService: LeadminerService);
    searchLeads(dto: SearchLeadsDTO): Promise<import("./leadminer.service").LeadMinerJobStartResponse>;
    getJobStatus(jobId: string): Promise<import("./leadminer.service").LeadMinerJobStatusResponse>;
    importLeads(dto: ImportLeadMinerLeadsDto): Promise<{
        id: string;
        companyId: string;
        name: string;
        phone: string | null;
        email: string | null;
        website: string | null;
        instagram: string | null;
        address: string | null;
        city: string | null;
        neighborhood: string | null;
        category: string | null;
        placeId: string | null;
        rating: number | null;
        reviewsCount: number | null;
        latitude: number | null;
        longitude: number | null;
        status: import("@prisma/client").$Enums.LeadStatus;
        statusLabel: string;
        statusColor: string;
        kanbanTracked: boolean;
        kanbanOrder: number;
        aiScore: number | null;
        aiNotes: string | null;
        source: string;
        rawData: import("@prisma/client/runtime/library").JsonValue;
        createdAt: string;
        updatedAt: string;
    }[]>;
}
