import { BrasilApiCnpjClient } from '../infrastructure/brasil-api-cnpj.client';
import { MinhaReceitaClient } from '../infrastructure/minha-receita.client';
import { NominatimClient } from '../infrastructure/nominatim.client';
import type { CompanyLookupRecord } from '../domain/company-lookup.types';
export declare class CompanyLookupService {
    private readonly brasilApiCnpjClient;
    private readonly minhaReceitaClient;
    private readonly nominatimClient;
    private readonly logger;
    constructor(brasilApiCnpjClient: BrasilApiCnpjClient, minhaReceitaClient: MinhaReceitaClient, nominatimClient: NominatimClient);
    lookup(cnpj: string): Promise<CompanyLookupRecord | null>;
    withGeocoding(record: CompanyLookupRecord): Promise<CompanyLookupRecord>;
    private buildAddress;
}
