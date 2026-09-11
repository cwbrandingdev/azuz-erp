import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { LeadStagesService } from '../leads/lead-stages.service';
import { CrmScopeService } from '../leads/crm-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { ImportLeadMinerLeadsDto } from './dto/import-leads.dto';
import { SearchLeadsDTO } from './dto/search-leads.dto';
export interface LeadMinerJobStartResponse {
    job_id: string;
    status: string;
}
export interface LeadMinerLead {
    title?: string;
    phone: string;
    address?: string;
    website?: string;
    rating?: number;
    reviews?: number;
    category?: string;
}
export interface LeadMinerJobStatusResponse {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    data?: LeadMinerLead[];
    error?: string;
}
export declare class LeadminerService {
    private readonly configService;
    private readonly prisma;
    private readonly aiService;
    private readonly companySettings;
    private readonly leadStages;
    private readonly crmScope;
    constructor(configService: ConfigService, prisma: PrismaService, aiService: AiService, companySettings: CompanySettingsService, leadStages: LeadStagesService, crmScope: CrmScopeService);
    private getLeadMinerBaseUrl;
    SearchLeads(payload: SearchLeadsDTO): Promise<LeadMinerJobStartResponse>;
    getJobStatus(jobId: string): Promise<LeadMinerJobStatusResponse>;
    importLeads(dto: ImportLeadMinerLeadsDto): Promise<{
        id: string;
        companyId: string;
        name: string;
        phone: string | null;
        email: string | null;
        website: string | null;
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
        rawData: Prisma.JsonValue;
        createdAt: string;
        updatedAt: string;
    }[]>;
    private markLeadForKanban;
    private toLeadResponse;
}
