import type { Prisma } from '@prisma/client';
import type { FetchMapsLeadsDto } from '../dto/fetch-maps-leads.dto';
import type { MappedPlace } from './maps-scraper.types';

interface SerpApiLocalPlace {
  title?: string;
  place_id?: string;
  phone?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviews?: number;
  type?: string;
  types?: string[];
  gps_coordinates?: { latitude?: number; longitude?: number };
  [key: string]: unknown;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeInstagramUrl(value: string): string | undefined {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  const handle = value.replace(/^@/, '').trim();
  if (!handle) return undefined;
  return `https://www.instagram.com/${handle.replace(/^\/+/, '')}/`;
}

function splitWebsiteAndInstagram(websiteRaw: unknown): {
  website?: string;
  instagram?: string;
} {
  const raw = asOptionalString(websiteRaw);
  if (!raw) return {};

  if (/instagram\.com/i.test(raw)) {
    return {
      instagram: normalizeInstagramUrl(raw),
      website: undefined,
    };
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return { website: raw };
  }

  return { website: `https://${raw}` };
}

function flattenLocalResults(body: unknown): SerpApiLocalPlace[] {
  if (typeof body !== 'object' || body === null) return [];
  const record = body as Record<string, unknown>;
  const local = record.local_results;
  if (Array.isArray(local)) {
    return local as SerpApiLocalPlace[];
  }
  if (typeof local === 'object' && local !== null) {
    const nested = local as Record<string, unknown>;
    if (Array.isArray(nested.places)) {
      return nested.places as SerpApiLocalPlace[];
    }
  }
  return [];
}

export function mapSerpApiPlaces(
  body: unknown,
  dto: FetchMapsLeadsDto,
): MappedPlace[] {
  const places = flattenLocalResults(body);
  const mapped: MappedPlace[] = [];

  for (const place of places) {
    const name = asOptionalString(place.title);
    if (!name) continue;

    const contact = splitWebsiteAndInstagram(place.website);
    const category =
      asOptionalString(place.type) ??
      (Array.isArray(place.types)
        ? asOptionalString(place.types[0])
        : undefined);

    mapped.push({
      name,
      phone: asOptionalString(place.phone),
      website: contact.website,
      instagram: contact.instagram,
      address: asOptionalString(place.address),
      city: dto.city,
      neighborhood: dto.neighborhood,
      category: category ?? dto.category,
      placeId: asOptionalString(place.place_id),
      rating: typeof place.rating === 'number' ? place.rating : undefined,
      reviewsCount:
        typeof place.reviews === 'number' ? place.reviews : undefined,
      latitude:
        typeof place.gps_coordinates?.latitude === 'number'
          ? place.gps_coordinates.latitude
          : undefined,
      longitude:
        typeof place.gps_coordinates?.longitude === 'number'
          ? place.gps_coordinates.longitude
          : undefined,
      source: 'serpapi',
      rawData: place as Prisma.InputJsonValue,
    });
  }

  return mapped;
}

export function buildSerpApiMapsQuery(dto: FetchMapsLeadsDto): string {
  const category = dto.category.trim();
  const neighborhood = dto.neighborhood.trim();
  const city = dto.city.trim();
  return `${category} em ${neighborhood}, ${city}`;
}
