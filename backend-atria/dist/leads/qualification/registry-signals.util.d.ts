import type { Lead } from '@prisma/client';
export interface RegistrySnapshot {
    cnpj: string;
    capitalSocial: number | null;
    legalName: string | null;
    fetchedAt: string;
}
export declare function extractCnpjFromRawData(rawData: unknown, placeId?: string | null): string | null;
export declare function extractCnpjFromLead(lead: Lead): string | null;
export declare function parseShareCapital(value: unknown): number | null;
export declare function readShareCapitalFromRawData(rawData: unknown): number | null;
export declare function readLegalNameFromRawData(rawData: unknown): string | null;
export declare function readCachedRegistrySnapshot(rawData: unknown): RegistrySnapshot | null;
export declare function readShareCapitalFromLead(lead: Lead): number | null;
export declare function leadHasIdentifiableCnpj(lead: Lead): boolean;
export declare function mergeRegistrySnapshotIntoRawData(rawData: unknown, snapshot: RegistrySnapshot): Record<string, unknown>;
export declare function materializeRegistrySnapshotFromRawData(rawData: unknown, placeId?: string | null): Record<string, unknown>;
