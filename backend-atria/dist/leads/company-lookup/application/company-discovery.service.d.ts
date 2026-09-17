import { CnaeResolverService } from './cnae-resolver.service';
import { CompanyLookupService } from './company-lookup.service';
import { NominatimClient } from '../infrastructure/nominatim.client';
import type { CompanyDiscoveryParams, DiscoveredCompanyCandidate } from '../domain/company-lookup.types';
export declare class CompanyDiscoveryService {
    private readonly cnaeResolver;
    private readonly companyLookup;
    private readonly nominatimClient;
    private readonly logger;
    constructor(cnaeResolver: CnaeResolverService, companyLookup: CompanyLookupService, nominatimClient: NominatimClient);
    discover(params: CompanyDiscoveryParams): Promise<DiscoveredCompanyCandidate[]>;
    private enrichCnpj;
    private buildSearchTerms;
    private simplifyCnaeDescription;
    private extractCnpjs;
    private matchesCnae;
    private looksLikeCnaeCode;
    private isActive;
    private matchesCompanyLocation;
    private matchesLocation;
    private buildKey;
    private normalizeText;
    private extractContactFromPlace;
}
