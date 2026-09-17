import { Lead, Prisma } from '@prisma/client';
import { InstagramApifyEnricher, type InstagramProfileQualificationData } from './instagram-apify.enricher';
export interface LeadQualificationResult {
    score: number;
    qualified: boolean;
    notes: string;
    instagram?: InstagramProfileQualificationData | null;
    usedApify: boolean;
}
export declare class LeadQualificationService {
    private readonly instagramEnricher;
    constructor(instagramEnricher: InstagramApifyEnricher);
    qualifyLead(lead: Lead, apifyToken: string | null): Promise<LeadQualificationResult>;
    mergeInstagramIntoRawData(lead: Lead, instagram: InstagramProfileQualificationData | null): Prisma.InputJsonValue;
    private computeScoreBreakdown;
    private buildNotes;
    private formatPostDate;
    private readCachedInstagram;
}
