import type { Lead } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { MappedPlace } from './maps-scraper.types';

export const MAPS_ENRICHMENT_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

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

export function leadNeedsMapsContactEnrichment(
  lead: Pick<Lead, 'instagram' | 'website' | 'rating'>,
): boolean {
  return (
    !lead.instagram?.trim() || !lead.website?.trim() || lead.rating == null
  );
}

export function instagramUrlFromValue(
  value: string | null | undefined,
): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;

  const fromUrl = raw.match(/instagram\.com\/([a-zA-Z0-9._]+)/i)?.[1];
  if (fromUrl) {
    return `https://www.instagram.com/${fromUrl.replace(/\/$/, '').toLowerCase()}/`;
  }

  return undefined;
}

export function contactGapsFromPlace(
  lead: Pick<
    Lead,
    | 'instagram'
    | 'website'
    | 'phone'
    | 'rating'
    | 'reviewsCount'
    | 'address'
    | 'neighborhood'
    | 'latitude'
    | 'longitude'
  >,
  place: MappedPlace,
): MapsContactUpdates {
  const updates: MapsContactUpdates = {};
  const instagram =
    instagramUrlFromValue(place.instagram) ??
    instagramUrlFromValue(place.website) ??
    instagramUrlFromValue(lead.website);

  if (!lead.instagram?.trim() && instagram) {
    updates.instagram = instagram;
  }
  if (!lead.website?.trim() && place.website?.trim()) {
    const website = place.website.trim();
    if (!/instagram\.com/i.test(website)) {
      updates.website = website;
    }
  }
  if (!lead.phone?.trim() && place.phone?.trim()) {
    updates.phone = place.phone.trim();
  }
  if (lead.rating == null && typeof place.rating === 'number') {
    updates.rating = place.rating;
  }
  if (lead.reviewsCount == null && typeof place.reviewsCount === 'number') {
    updates.reviewsCount = place.reviewsCount;
  }
  if (!lead.address?.trim() && place.address?.trim()) {
    updates.address = place.address.trim();
  }
  if (!lead.neighborhood?.trim() && place.neighborhood?.trim()) {
    updates.neighborhood = place.neighborhood.trim();
  }
  if (lead.latitude == null && typeof place.latitude === 'number') {
    updates.latitude = place.latitude;
  }
  if (lead.longitude == null && typeof place.longitude === 'number') {
    updates.longitude = place.longitude;
  }

  return updates;
}

export function readCachedMapsEnrichment(
  rawData: unknown,
): MapsEnrichmentSnapshot | null {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return null;
  }

  const snapshot = (rawData as Record<string, unknown>).mapsEnrichment;
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return null;
  }

  const data = snapshot as MapsEnrichmentSnapshot;
  if (
    !data.fetchedAt ||
    Date.parse(data.fetchedAt) < Date.now() - MAPS_ENRICHMENT_CACHE_MS
  ) {
    return null;
  }

  return data;
}

export function mergeMapsEnrichmentIntoRawData(
  rawData: unknown,
  snapshot: MapsEnrichmentSnapshot,
): Prisma.InputJsonValue {
  const base =
    rawData && typeof rawData === 'object' && !Array.isArray(rawData)
      ? { ...(rawData as Record<string, unknown>) }
      : {};

  base.mapsEnrichment = snapshot;
  return base as Prisma.InputJsonValue;
}

export function mostCommonNeighborhood(
  values: Array<string | null | undefined>,
  fallback: string,
): string {
  const counts = new Map<string, number>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }

  let best = fallback;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}
