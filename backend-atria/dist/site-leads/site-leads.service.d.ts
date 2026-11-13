import { ConfigService } from '@nestjs/config';
export interface SiteLead {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    instagram?: string;
    revenue?: string;
    traffic?: string;
    objective?: string;
    createdAt?: string;
}
export declare class SiteLeadsService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    listLeads(): Promise<{
        leads: SiteLead[];
    }>;
}
