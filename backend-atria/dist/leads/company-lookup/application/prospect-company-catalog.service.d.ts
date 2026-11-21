import { PrismaService } from '../../../prisma/prisma.service';
import type { DiscoveredCompanyCandidate } from '../domain/company-lookup.types';
export declare const CATALOG_DEFAULT_PAGE_SIZE = 25;
export interface CatalogSearchParams {
    queryValue: string;
    city: string;
    uf: string;
    neighborhood?: string;
    cnaeCodes: string[];
    page?: number;
    pageSize?: number;
    name?: string;
    openedFrom?: string;
    openedTo?: string;
    maxResults?: number;
}
export interface CatalogSearchPageResult {
    items: CatalogCandidate[];
    totalCount: number;
    page: number;
    pageSize: number;
}
export interface CatalogCandidate extends DiscoveredCompanyCandidate {
    aiScore: number;
    aiNotes: string;
}
export declare class ProspectCompanyCatalogService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    searchPage(params: CatalogSearchParams): Promise<CatalogSearchPageResult>;
    private buildWhere;
    private buildCnaeFilter;
    private uniqueCodes;
    private uniquePrefixes;
    private parseDayStart;
    private parseDayEnd;
    private toCandidate;
}
