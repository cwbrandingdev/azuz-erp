import type { Lead } from '@prisma/client';
export type CnpjMatchMethod = 'existing_cnpj' | 'website' | 'phone' | 'name_city';
export interface RegistrySnapshot {
    cnpj: string;
    capitalSocial: number | null;
    legalName: string | null;
    companySize?: string | null;
    matchMethod?: CnpjMatchMethod;
    fetchedAt: string;
}
export type RegistryLookupStatus = 'not_found' | 'unavailable';
export interface RegistryLookupCache {
    status: RegistryLookupStatus;
    fetchedAt: string;
}
export declare function formatCompanySize(value: string | null | undefined): string | null;
export declare function readCompanySizeLabel(raw: Record<string, unknown> | null | undefined): string | null;
export declare function extractCnpjFromRawData(rawData: unknown, placeId?: string | null): string | null;
export declare function extractCnpjFromLead(lead: Lead): string | null;
export declare function parseShareCapital(value: unknown): number | null;
export declare function readShareCapitalFromRawData(rawData: unknown): number | null;
export declare function readLegalNameFromRawData(rawData: unknown): string | null;
export declare function readRegistryLookupCache(rawData: unknown): RegistryLookupCache | null;
export declare function readCachedRegistrySnapshot(rawData: unknown): RegistrySnapshot | null;
export declare function readShareCapitalFromLead(lead: Lead): number | null;
export declare function leadHasIdentifiableCnpj(lead: Lead): boolean;
export declare function mergeRegistrySnapshotIntoRawData(rawData: unknown, snapshot: RegistrySnapshot): Record<string, unknown>;
export declare function materializeRegistrySnapshotFromRawData(rawData: unknown, placeId?: string | null): Record<string, unknown>;
