import { PrismaService } from '../../../prisma/prisma.service';
import type { DiscoveredCompanyCandidate } from '../domain/company-lookup.types';
export declare const DEFAULT_CATALOG_MAX_RESULTS = 100;
export declare const CATALOG_MAX_RESULTS_LIMIT = 100;
export interface CatalogSearchParams {
    queryValue: string;
    city: string;
    uf: string;
    neighborhood?: string;
    cnaeCodes: string[];
    maxResults?: number;
}
export interface CatalogCandidate extends DiscoveredCompanyCandidate {
    aiScore: number;
    aiNotes: string;
}
export declare class ProspectCompanyCatalogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    search(params: CatalogSearchParams): Promise<CatalogCandidate[]>;
    private buildWhere;
    private buildCnaeFilter;
    private uniqueCodes;
    private uniquePrefixes;
    private toCandidate;
    private resolveLimit;
}
