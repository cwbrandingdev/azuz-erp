import { Lead, Prisma } from '@prisma/client';
import { CommercialFitService, type CommercialFitResult } from './commercial-fit.service';
import { CompanyLookupService } from '../company-lookup/application/company-lookup.service';
import { InstagramApifyEnricher, type InstagramProfileQualificationData } from './instagram-apify.enricher';
export interface LeadQualificationResult {
    score: number;
    operationalScore: number;
    commercialScore: number;
    qualified: boolean;
    notes: string;
    instagram?: InstagramProfileQualificationData | null;
    commercialFit?: CommercialFitResult;
    usedApify: boolean;
    mergedRawData: Prisma.InputJsonValue;
}
export declare class LeadQualificationService {
    private readonly instagramEnricher;
    private readonly commercialFit;
    private readonly companyLookup;
    constructor(instagramEnricher: InstagramApifyEnricher, commercialFit: CommercialFitService, companyLookup: CompanyLookupService);
    qualifyLead(lead: Lead, apifyToken: string | null): Promise<LeadQualificationResult>;
    private resolveInstagramData;
    private enrichLeadRegistry;
    mergeQualificationRawData(lead: Lead, input: {
        instagram: InstagramProfileQualificationData | null;
        commercialFit: CommercialFitResult | null;
    }): Prisma.InputJsonValue;
    mergeInstagramIntoRawData(lead: Lead, instagram: InstagramProfileQualificationData | null): Prisma.InputJsonValue;
    private computeOperationalScoreBreakdown;
    private buildNotes;
    private formatFactor;
    private verdictLabel;
    private formatPostDate;
    private readCachedInstagram;
}
