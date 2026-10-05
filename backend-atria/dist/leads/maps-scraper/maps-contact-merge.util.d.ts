import type { Lead } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { MappedPlace } from './maps-scraper.types';
export declare const MAPS_ENRICHMENT_CACHE_MS: number;
export interface MapsContactUpdates {
    instagram?: string;
    website?: string;
    phone?: string;
    rating?: number;
    reviewsCount?: number;
    address?: string;
    neighborhood?: string;
    latitude?: number;
    longitude?: number;
}
export interface MapsEnrichmentSnapshot {
    fetchedAt: string;
    provider: 'apify';
    matchedName: string | null;
    placeId?: string;
    instagram?: string;
    website?: string;
    rating?: number;
    reviewsCount?: number;
}
export declare function leadNeedsMapsContactEnrichment(lead: Pick<Lead, 'instagram' | 'website' | 'rating'>): boolean;
export declare function instagramUrlFromValue(value: string | null | undefined): string | undefined;
export declare function contactGapsFromPlace(lead: Pick<Lead, 'instagram' | 'website' | 'phone' | 'rating' | 'reviewsCount' | 'address' | 'neighborhood' | 'latitude' | 'longitude'>, place: MappedPlace): MapsContactUpdates;
export declare function readCachedMapsEnrichment(rawData: unknown): MapsEnrichmentSnapshot | null;
export declare function mergeMapsEnrichmentIntoRawData(rawData: unknown, snapshot: MapsEnrichmentSnapshot): Prisma.InputJsonValue;
export declare function mostCommonNeighborhood(values: Array<string | null | undefined>, fallback: string): string;
