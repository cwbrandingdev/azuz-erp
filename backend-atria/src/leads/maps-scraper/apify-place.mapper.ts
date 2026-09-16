import type { Prisma } from '@prisma/client';
import type { FetchMapsLeadsDto } from '../dto/fetch-maps-leads.dto';
import type { MappedPlace } from './maps-scraper.types';

interface ApifyPlace {
  title?: string;
  name?: string;
  phone?: string;
  phoneUnformatted?: string;
  email?: string;
  website?: string;
  url?: string;
  domain?: string;
  menu?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  categoryName?: string;
  category?: string;
  placeId?: string;
  totalScore?: number;
  reviewsCount?: number;
  location?: { lat?: number; lng?: number };
  contacts?: Array<Record<string, unknown>>;
  instagrams?: string[];
  phones?: string[];
  companyPhoneNumber?: string;
  [key: string]: unknown;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function extractApifyPhone(place: ApifyPlace): string | undefined {
  const direct = asOptionalString(
    place.phoneUnformatted ?? place.phone ?? place.companyPhoneNumber,
  );
  if (direct) {
    return direct;
  }

  if (Array.isArray(place.phones)) {
    for (const phone of place.phones) {
      const normalized = asOptionalString(phone);
      if (normalized) {
        return normalized;
      }
    }
  }

  if (Array.isArray(place.contacts)) {
    for (const contact of place.contacts) {
      const phone = asOptionalString(contact.phoneUnformatted ?? contact.phone);
      if (phone) {
        return phone;
      }
    }
  }

  return undefined;
}

function extractApifyInstagram(place: ApifyPlace): string | undefined {
  const instagrams = place.instagrams;
  if (!Array.isArray(instagrams)) {
    return undefined;
  }

  for (const entry of instagrams) {
    const normalized = normalizeInstagramUrl(entry);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function normalizeInstagramUrl(value: unknown): string | undefined {
  const raw = asOptionalString(value);
  if (!raw) {
    return undefined;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const handle = raw.replace(/^@/, "").trim();
  if (!handle) {
    return undefined;
  }

  return `https://www.instagram.com/${handle.replace(/^\/+/, "")}/`;
}

function extractApifyWebsite(place: ApifyPlace): string | undefined {
  const website = asOptionalString(
    place.website ?? place.url ?? place.domain ?? place.menu,
  );

  if (!website) {
    return undefined;
  }

  if (website.startsWith('http://') || website.startsWith('https://')) {
    return website;
  }

  return `https://${website}`;
}

export function mapApifyPlaces(
  body: unknown,
  dto: FetchMapsLeadsDto,
): MappedPlace[] {
  const places = (Array.isArray(body) ? body : []) as ApifyPlace[];
  const mapped: MappedPlace[] = [];

  for (const place of places) {
    const name = asOptionalString(place.title ?? place.name);
    if (!name) continue;

    mapped.push({
      name,
      phone: extractApifyPhone(place),
      email: asOptionalString(place.email),
      website: extractApifyWebsite(place),
      instagram: extractApifyInstagram(place),
      address: asOptionalString(place.address),
      city: asOptionalString(place.city) ?? dto.city,
      neighborhood:
        asOptionalString(place.neighborhood) ?? dto.neighborhood,
      category:
        asOptionalString(place.categoryName ?? place.category) ?? dto.category,
      placeId: asOptionalString(place.placeId),
      rating:
        typeof place.totalScore === 'number' ? place.totalScore : undefined,
      reviewsCount:
        typeof place.reviewsCount === 'number' ? place.reviewsCount : undefined,
      latitude:
        typeof place.location?.lat === 'number' ? place.location.lat : undefined,
      longitude:
        typeof place.location?.lng === 'number' ? place.location.lng : undefined,
      source: 'apify',
      rawData: place as Prisma.InputJsonValue,
    });
  }

  return mapped;
}

export function buildApifyActorInput(
  dto: FetchMapsLeadsDto,
  maxResults: number,
) {
  const category = dto.category.trim();
  const neighborhood = dto.neighborhood.trim();
  const city = dto.city.trim();

  return {
    searchStringsArray: [`${category} em ${neighborhood}, ${city}`],
    locationQuery: `${neighborhood}, ${city}, Brasil`,
    language: 'pt-BR',
    maxCrawledPlacesPerSearch: maxResults,
    scrapePlaceDetailPage: true,
    scrapeContacts: true,
    scrapeSocialMediaProfiles: {
      instagrams: true,
      facebooks: false,
      youtubes: false,
      tiktoks: false,
      twitters: false,
    },
  };
}
