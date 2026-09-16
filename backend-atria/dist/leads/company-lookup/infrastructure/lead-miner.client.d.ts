import { ConfigService } from '@nestjs/config';
export interface LeadMinerSearchPayload {
    category: string;
    city: string;
    neighborhood: string;
    max_results: number;
}
export interface LeadMinerLeadRecord {
    title?: string;
    phone: string;
    address?: string;
    website?: string | null;
    instagram?: string | null;
    rating?: number;
    reviews?: number;
    category?: string;
}
export declare class LeadMinerClient {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    searchAndWait(payload: LeadMinerSearchPayload): Promise<LeadMinerLeadRecord[]>;
    private getBaseUrl;
    private startSearch;
    private pollUntilComplete;
    private getJobStatus;
    private sleep;
}
export declare function parseLeadMinerWebsiteAndInstagram(website?: string | null, instagram?: string | null): {
    website?: string;
    instagram?: string;
};
