import { IbgeCnaeClient } from '../infrastructure/ibge-cnae.client';
import type { CnaeClassInfo, LeadSearchQueryTypeValue } from '../domain/company-lookup.types';
export declare class CnaeResolverService {
    private readonly ibgeCnaeClient;
    constructor(ibgeCnaeClient: IbgeCnaeClient);
    search(query: string, limit?: number): Promise<{
        id: string;
        description: string;
    }[]>;
    resolve(queryType: LeadSearchQueryTypeValue, queryValue: string): Promise<CnaeClassInfo[]>;
    private normalizeCnaeCode;
    private normalizeText;
}
