import { Injectable, Logger } from '@nestjs/common';
import { Lead, Prisma, ProspectCompany } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyLookupService } from '../company-lookup/application/company-lookup.service';
import { normalizeCatalogText } from '../company-lookup/domain/text-normalize';
import {
  COMPANY_NAME_MATCH_THRESHOLD,
  bestNameScore,
  companyNameTokens,
} from '../maps-scraper/company-place-match.util';
import { instagramUrlFromValue } from '../maps-scraper/maps-contact-merge.util';
import { MapsScraperService } from '../maps-scraper/maps-scraper.service';
import {
  InstagramApifyEnricher,
  readFreshInstagramQualification,
  type InstagramProfileQualificationData,
} from './instagram-apify.enricher';
import {
  extractCnpjFromLead,
  parseShareCapital,
  readCachedRegistrySnapshot,
  readCompanySizeLabel,
  readLegalNameFromRawData,
  readRegistryLookupCache,
  type CnpjMatchMethod,
  type RegistryLookupCache,
  type RegistrySnapshot,
} from './registry-signals.util';
import { findCnpjOnWebsite } from './website-cnpj.finder';

const FACADE_HIT_CACHE_MS = 30 * 24 * 60 * 60 * 1000;
const FACADE_MISS_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const FACADE_IMAGE_COUNT = 1;

export interface FacadeSnapshot {
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  fetchedAt: string;
  provider: 'apify';
}

export interface LeadDossierUpdate {
  rawData: Prisma.InputJsonValue;
  cnpj?: string;
  latitude?: number;
  longitude?: number;
  instagram?: string;
  website?: string;
}

interface RegistryResolution {
  snapshot: RegistrySnapshot | null;
  lookup: RegistryLookupCache | null;
}

@Injectable()
export class LeadDossierService {
  private readonly logger = new Logger(LeadDossierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mapsScraper: MapsScraperService,
    private readonly companyLookup: CompanyLookupService,
    private readonly instagramEnricher: InstagramApifyEnricher,
  ) {}

  async collect(
    lead: Lead,
    apifyToken: string | null,
  ): Promise<LeadDossierUpdate> {
    const [facade, registry, instagram] = await Promise.all([
      this.resolveFacade(lead, apifyToken),
      this.resolveRegistry(lead),
      this.resolveInstagram(lead, apifyToken),
    ]);

    let resolvedRegistry = registry;
    const discoveredWebsite = usableWebsite(facade.website);
    if (
      !resolvedRegistry.snapshot &&
      discoveredWebsite &&
      !lead.website?.trim()
    ) {
      resolvedRegistry = await this.resolveRegistry({
        ...lead,
        website: discoveredWebsite,
      });
    }

    let instagramData = instagram;
    const discoveredInstagram =
      instagramUrlFromValue(facade.instagram) ??
      instagramUrlFromValue(discoveredWebsite);
    const instagramHandle =
      lead.instagram?.trim() || discoveredInstagram || undefined;
    if (
      !instagramData &&
      !lead.instagram?.trim() &&
      discoveredInstagram &&
      apifyToken
    ) {
      instagramData = await this.fetchInstagram(discoveredInstagram, apifyToken);
    }

    const raw = this.mergeRawData(lead.rawData, {
      facade: facade.snapshot,
      registry: resolvedRegistry,
      instagram: instagramData,
    });

    const cnpj = resolvedRegistry.snapshot?.cnpj;
    return {
      rawData: raw,
      ...(cnpj && !lead.cnpj?.trim() ? { cnpj } : {}),
      ...(facade.latitude != null && lead.latitude == null
        ? { latitude: facade.latitude }
        : {}),
      ...(facade.longitude != null && lead.longitude == null
        ? { longitude: facade.longitude }
        : {}),
      ...(instagramHandle && !lead.instagram?.trim()
        ? { instagram: instagramHandle }
        : {}),
      ...(discoveredWebsite && !lead.website?.trim()
        ? { website: discoveredWebsite }
        : {}),
    };
  }

  private async resolveFacade(
    lead: Lead,
    apifyToken: string | null,
  ): Promise<{
    snapshot: FacadeSnapshot | null;
    instagram?: string;
    website?: string;
    latitude?: number;
    longitude?: number;
  }> {
    const cached = readFacadeSnapshot(lead.rawData);
    if (cached && isFacadeFresh(cached)) {
      return {
        snapshot: cached,
        latitude: cached.latitude ?? undefined,
        longitude: cached.longitude ?? undefined,
      };
    }

    if (!apifyToken || !lead.city?.trim() || !lead.name.trim()) {
      return { snapshot: cached };
    }

    const result = await this.mapsScraper.lookupCompanyPlaceResult(
      {
        name: lead.name,
        legalName: readLegalNameFromRawData(lead.rawData),
        city: lead.city,
        neighborhood: lead.neighborhood,
      },
      { maxImages: FACADE_IMAGE_COUNT },
    );
    if (result.failed) {
      return { snapshot: cached };
    }

    const place = result.place;
    const snapshot: FacadeSnapshot = {
      imageUrl: place?.imageUrl ?? null,
      latitude: place?.latitude ?? lead.latitude ?? null,
      longitude: place?.longitude ?? lead.longitude ?? null,
      fetchedAt: new Date().toISOString(),
      provider: 'apify',
    };
    return {
      snapshot,
      instagram: place?.instagram,
      website: place?.website,
      latitude: snapshot.latitude ?? undefined,
      longitude: snapshot.longitude ?? undefined,
    };
  }

  private async resolveRegistry(lead: Lead): Promise<RegistryResolution> {
    const cached = readCachedRegistrySnapshot(lead.rawData);
    if (cached?.cnpj) {
      return { snapshot: cached, lookup: null };
    }
    const cachedLookup = readRegistryLookupCache(lead.rawData);
    if (cachedLookup) {
      return { snapshot: null, lookup: cachedLookup };
    }

    const existing = cnpjFromLead(lead);
    if (existing) {
      return this.lookupMatchedCnpj(existing, 'existing_cnpj');
    }

    const website = lead.website?.trim();
    if (website) {
      try {
        const found = await findCnpjOnWebsite(website);
        if (found.cnpj) {
          return this.lookupMatchedCnpj(found.cnpj, 'website');
        }
        if (!found.fetched) {
          const catalog = await this.matchCatalog(lead);
          if (catalog) return { snapshot: catalog, lookup: null };
          return { snapshot: null, lookup: null };
        }
      } catch (error) {
        this.logger.warn(`Website CNPJ lookup failed: ${String(error)}`);
      }
    }

    try {
      const catalog = await this.matchCatalog(lead);
      if (catalog) return { snapshot: catalog, lookup: null };
    } catch (error) {
      this.logger.warn(`Catalog CNPJ match failed: ${String(error)}`);
      return {
        snapshot: null,
        lookup: { status: 'unavailable', fetchedAt: new Date().toISOString() },
      };
    }

    return {
      snapshot: null,
      lookup: { status: 'not_found', fetchedAt: new Date().toISOString() },
    };
  }

  private async lookupMatchedCnpj(
    cnpj: string,
    matchMethod: CnpjMatchMethod,
  ): Promise<RegistryResolution> {
    try {
      const record = await this.companyLookup.lookupRegistry(cnpj);
      if (!record) {
        return {
          snapshot: null,
          lookup: {
            status: 'unavailable',
            fetchedAt: new Date().toISOString(),
          },
        };
      }
      return {
        snapshot: {
          cnpj: record.cnpj,
          capitalSocial:
            record.shareCapital ??
            parseShareCapital(record.rawData.capital_social) ??
            null,
          legalName: record.legalName,
          companySize: readCompanySizeLabel(record.rawData),
          matchMethod,
          fetchedAt: new Date().toISOString(),
        },
        lookup: null,
      };
    } catch (error) {
      this.logger.warn(`Registry lookup failed for ${cnpj}: ${String(error)}`);
      return {
        snapshot: null,
        lookup: { status: 'unavailable', fetchedAt: new Date().toISOString() },
      };
    }
  }

  private async matchCatalog(lead: Lead): Promise<RegistrySnapshot | null> {
    const byPhone = await this.matchCatalogByPhone(lead);
    if (byPhone) return byPhone;
    return this.matchCatalogByName(lead);
  }

  private async matchCatalogByPhone(
    lead: Lead,
  ): Promise<RegistrySnapshot | null> {
    const national = nationalPhone(lead.phone);
    if (!national) return null;
    const rows = await this.prisma.prospectCompany.findMany({
      where: { phone: { contains: national.slice(-8) } },
      take: 30,
    });
    const matches = rows.filter((row) => nationalPhone(row.phone) === national);
    if (matches.length === 0) return null;
    const city = lead.city ? normalizeCatalogText(lead.city) : '';
    const preferred =
      (city
        ? matches.find((row) => row.cityNormalized === city)
        : undefined) ?? matches[0];
    return snapshotFromCatalog(preferred, 'phone');
  }

  private async matchCatalogByName(
    lead: Lead,
  ): Promise<RegistrySnapshot | null> {
    if (!lead.city?.trim() || !lead.name.trim()) return null;
    const tokens = companyNameTokens(lead.name).sort(
      (left, right) => right.length - left.length,
    );
    const token = tokens.find((item) => item.length >= 4) ?? tokens[0];
    if (!token) return null;

    const rows = await this.prisma.prospectCompany.findMany({
      where: {
        cityNormalized: normalizeCatalogText(lead.city),
        OR: [
          { tradeName: { contains: token, mode: 'insensitive' } },
          { legalName: { contains: token, mode: 'insensitive' } },
        ],
      },
      take: 40,
    });

    let best: { row: ProspectCompany; score: number } | null = null;
    for (const row of rows) {
      const score = bestNameScore(lead.name, [row.tradeName, row.legalName]);
      if (score < COMPANY_NAME_MATCH_THRESHOLD) continue;
      if (!best || score > best.score) best = { row, score };
    }
    return best ? snapshotFromCatalog(best.row, 'name_city') : null;
  }

  private async resolveInstagram(
    lead: Lead,
    apifyToken: string | null,
  ): Promise<InstagramProfileQualificationData | null> {
    const cached = readFreshInstagramQualification(lead.rawData);
    if (cached) return cached;
    const handle = lead.instagram?.trim();
    if (!handle || !apifyToken) return null;
    return this.fetchInstagram(handle, apifyToken);
  }

  private async fetchInstagram(
    instagram: string,
    apifyToken: string,
  ): Promise<InstagramProfileQualificationData | null> {
    try {
      return await this.instagramEnricher.fetchProfileSignals(
        instagram,
        apifyToken,
      );
    } catch (error) {
      this.logger.warn(`Instagram dossier lookup failed: ${String(error)}`);
      return null;
    }
  }

  private mergeRawData(
    rawData: Lead['rawData'],
    input: {
      facade: FacadeSnapshot | null;
      registry: RegistryResolution;
      instagram: InstagramProfileQualificationData | null;
    },
  ): Prisma.InputJsonValue {
    const base =
      rawData && typeof rawData === 'object' && !Array.isArray(rawData)
        ? { ...(rawData as Record<string, unknown>) }
        : {};

    if (input.facade) {
      base.facade = input.facade;
    }
    if (input.registry.snapshot) {
      base.registrySnapshot = input.registry.snapshot;
      base.cnpj = input.registry.snapshot.cnpj;
      delete base.registryLookup;
    } else if (input.registry.lookup) {
      base.registryLookup = input.registry.lookup;
    }
    if (input.instagram) {
      base.instagramQualification = input.instagram;
    }

    return base as Prisma.InputJsonValue;
  }
}

function snapshotFromCatalog(
  row: ProspectCompany,
  matchMethod: CnpjMatchMethod,
): RegistrySnapshot {
  return {
    cnpj: row.cnpj,
    capitalSocial: row.shareCapital,
    legalName: row.legalName,
    companySize: readCompanySizeLabel({ companySize: row.companySize }),
    matchMethod,
    fetchedAt: new Date().toISOString(),
  };
}

function cnpjFromLead(lead: Lead): string | null {
  const column = lead.cnpj?.replace(/\D/g, '') ?? '';
  if (column.length === 14) return column;
  return extractCnpjFromLead(lead);
}

function nationalPhone(value: string | null | undefined): string | null {
  let digits = value?.replace(/\D/g, '') ?? '';
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.length < 10 || digits.length > 11) return null;
  return digits;
}

function usableWebsite(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || /instagram\.com/i.test(trimmed)) return undefined;
  return trimmed;
}

function readFacadeSnapshot(rawData: unknown): FacadeSnapshot | null {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return null;
  }
  const facade = (rawData as Record<string, unknown>).facade;
  if (!facade || typeof facade !== 'object' || Array.isArray(facade)) {
    return null;
  }
  const data = facade as FacadeSnapshot;
  if (!data.fetchedAt || data.provider !== 'apify') return null;
  return data;
}

function isFacadeFresh(snapshot: FacadeSnapshot): boolean {
  const fetchedAt = Date.parse(snapshot.fetchedAt);
  if (!Number.isFinite(fetchedAt)) return false;
  const maxAge = snapshot.imageUrl ? FACADE_HIT_CACHE_MS : FACADE_MISS_CACHE_MS;
  return Date.now() - fetchedAt < maxAge;
}
