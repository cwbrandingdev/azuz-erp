import type { CompanyLookupRecord } from '../domain/company-lookup.types';
export declare class BrasilApiCnpjClient {
    private readonly logger;
    lookup(cnpj: string): Promise<CompanyLookupRecord | null>;
    private mapResponse;
    private parseShareCapital;
    private buildPhone;
    private normalizeCnpj;
    private normalizeCnaeCode;
}
