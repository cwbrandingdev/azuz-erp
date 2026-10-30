import type { MappedPlace } from './maps-scraper.types';
export declare const COMPANY_NAME_MATCH_THRESHOLD = 0.6;
export declare function normalizeCompanyName(value: string): string;
export declare function companyNameTokens(value: string): string[];
export declare function scoreCompanyNameMatch(left: string, right: string): number;
export declare function bestNameScore(placeName: string, candidates: Array<string | null | undefined>): number;
export declare function pickBestPlaceForCompany(places: MappedPlace[], names: Array<string | null | undefined>): MappedPlace | null;
export declare function matchPlacesToCompanies<T extends {
    id: string;
    name: string;
}>(companies: T[], places: MappedPlace[], extraNames: (company: T) => Array<string | null | undefined>): Array<{
    company: T;
    place: MappedPlace;
    score: number;
}>;
