import { PrismaService } from '../../../prisma/prisma.service';
import { IbgeCnaeClient } from '../infrastructure/ibge-cnae.client';
import type { CnaeClassInfo, LeadSearchQueryTypeValue } from '../domain/company-lookup.types';
export declare class CnaeResolverService {
    private readonly prisma;
    private readonly ibgeCnaeClient;
    constructor(prisma: PrismaService, ibgeCnaeClient: IbgeCnaeClient);
    search(query: string, limit?: number): Promise<CnaeClassInfo[]>;
    resolve(_queryType: LeadSearchQueryTypeValue, queryValue: string): Promise<CnaeClassInfo[]>;
    cnaeFilterCodes(resolved: CnaeClassInfo[]): string[];
    formatSubclassCode(digits: string): string;
    private loadCatalog;
    private rankMatch;
    private codesMatch;
    private normalizeCnaeCode;
    private normalizeText;
}
