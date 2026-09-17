import { IbgeCnaeClient } from '../infrastructure/ibge-cnae.client';
import type { CnaeClassInfo, LeadSearchQueryTypeValue } from '../domain/company-lookup.types';
export declare class CnaeResolverService {
    private readonly ibgeCnaeClient;
    constructor(ibgeCnaeClient: IbgeCnaeClient);
    search(query: string, limit?: number): Promise<CnaeClassInfo[]>;
    resolve(queryType: LeadSearchQueryTypeValue, queryValue: string): Promise<CnaeClassInfo[]>;
    leadMinerCategory(queryValue: string, resolved: CnaeClassInfo[]): string;
    cnaeFilterCodes(resolved: CnaeClassInfo[]): string[];
    formatSubclassCode(digits: string): string;
    private subclassInfo;
    private leadMinerTermFromSubclass;
    private simplifyForLeadMiner;
    private pickMostSpecific;
    private codesMatch;
    private normalizeCnaeCode;
    private normalizeText;
}
