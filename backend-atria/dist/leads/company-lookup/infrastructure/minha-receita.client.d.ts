import type { CompanyLookupRecord } from '../domain/company-lookup.types';
export declare class MinhaReceitaClient {
    private readonly logger;
    lookup(cnpj: string): Promise<CompanyLookupRecord | null>;
    private mapResponse;
    private buildPhone;
    private normalizeCnpj;
    private normalizeCnaeCode;
}
