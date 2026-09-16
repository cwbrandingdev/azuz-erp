export type LeadSearchQueryTypeValue = 'NICHO' | 'CNAE';
export interface CnaeClassInfo {
    id: string;
    description: string;
}
export interface CompanyLookupRecord {
    cnpj: string;
    legalName: string;
    tradeName?: string;
    phone?: string;
    email?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    primaryCnaeCode?: string;
    primaryCnaeDescription?: string;
    secondaryCnaeCodes: string[];
    registrationStatus?: string;
    latitude?: number;
    longitude?: number;
    rawData: Record<string, unknown>;
}
export interface GeocodingResult {
    latitude: number;
    longitude: number;
    displayName: string;
    extratags?: Record<string, string>;
    address?: Record<string, string>;
}
export interface CompanyDiscoveryParams {
    queryType: LeadSearchQueryTypeValue;
    queryValue: string;
    city: string;
    uf: string;
    maxResults?: number;
}
export interface DiscoveredCompanyCandidate {
    cnpj?: string;
    name: string;
    phone?: string;
    email?: string;
    website?: string;
    instagram?: string;
    address?: string;
    city?: string;
    neighborhood?: string;
    category?: string;
    placeId?: string;
    rating?: number;
    reviewsCount?: number;
    latitude?: number;
    longitude?: number;
    source: string;
    rawData: Record<string, unknown>;
}
