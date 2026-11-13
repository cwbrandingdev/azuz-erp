import { SiteLeadsService } from './site-leads.service';
export declare class SiteLeadsController {
    private readonly siteLeadsService;
    constructor(siteLeadsService: SiteLeadsService);
    list(): Promise<{
        leads: import("./site-leads.service").SiteLead[];
    }>;
}
