import { Injectable, Logger } from '@nestjs/common';
import { CnaeResolverService } from './cnae-resolver.service';
import { CompanyLookupService } from './company-lookup.service';
import { NominatimClient } from '../infrastructure/nominatim.client';
import { BRAZIL_STATE_NAMES } from '../domain/brazil-states';
import type {
  CompanyDiscoveryParams,
  DiscoveredCompanyCandidate,
} from '../domain/company-lookup.types';

const DEFAULT_MAX_RESULTS = 20;
const NOMINATIM_RESULTS_PER_TERM = 15;
const ACTIVE_STATUS_CODES = new Set(['2', 'ATIVA', 'ATIVO']);

@Injectable()
export class CompanyDiscoveryService {
  private readonly logger = new Logger(CompanyDiscoveryService.name);

  constructor(
    private readonly cnaeResolver: CnaeResolverService,
    private readonly companyLookup: CompanyLookupService,
    private readonly nominatimClient: NominatimClient,
  ) {}

  async discover(
    params: CompanyDiscoveryParams,
  ): Promise<DiscoveredCompanyCandidate[]> {
    const maxResults = params.maxResults ?? DEFAULT_MAX_RESULTS;
    const cnaeClasses = await this.cnaeResolver.resolve(
      params.queryType,
      params.queryValue,
    );
    const cnaeCodes = this.cnaeResolver.cnaeFilterCodes(cnaeClasses);
    const searchTerms = this.buildSearchTerms(params, cnaeClasses);
    const explicitCnpjs = this.extractCnpjs(params.queryValue);
    const discovered = new Map<string, DiscoveredCompanyCandidate>();

    for (const cnpj of explicitCnpjs) {
      const enriched = await this.enrichCnpj(cnpj, cnaeCodes, params);
      if (enriched) {
        discovered.set(this.buildKey(enriched), enriched);
      }
    }

    for (const term of searchTerms) {
      if (discovered.size >= maxResults) {
        break;
      }

      try {
        const places = await this.nominatimClient.searchBusinesses(
          term,
          params.city,
          params.uf,
          Math.min(NOMINATIM_RESULTS_PER_TERM, maxResults),
        );

        for (const place of places) {
          if (discovered.size >= maxResults) {
            break;
          }

          const cnpj = this.nominatimClient.extractCnpjFromExtratags(
            place.extratags,
          );

          if (cnpj) {
            const enriched = await this.enrichCnpj(cnpj, cnaeCodes, params);
            if (enriched) {
              discovered.set(this.buildKey(enriched), enriched);
            }
            continue;
          }

          const candidate: DiscoveredCompanyCandidate = {
            name: place.displayName.split(',')[0]?.trim() || place.displayName,
            phone: this.extractContactFromPlace(place, 'phone'),
            website: this.extractContactFromPlace(place, 'website'),
            address: place.displayName,
            city: params.city,
            category: term,
            latitude: place.latitude,
            longitude: place.longitude,
            source: 'nominatim',
            rawData: { ...place },
          };

          if (this.matchesLocation(candidate, params)) {
            discovered.set(this.buildKey(candidate), candidate);
          }
        }
      } catch (error) {
        this.logger.warn(`Nominatim discovery failed for "${term}": ${String(error)}`);
      }
    }

    return Array.from(discovered.values()).slice(0, maxResults);
  }

  private async enrichCnpj(
    cnpj: string,
    cnaeCodes: string[],
    params: CompanyDiscoveryParams,
  ): Promise<DiscoveredCompanyCandidate | null> {
    const record = await this.companyLookup.lookup(cnpj);
    if (!record) {
      return null;
    }

    if (!this.isActive(record.registrationStatus)) {
      return null;
    }

    if (!this.matchesCnae(record, cnaeCodes)) {
      return null;
    }

    if (!this.matchesCompanyLocation(record, params.city, params.uf)) {
      return null;
    }

    const address = [
      record.street,
      record.number,
      record.neighborhood,
      record.city,
      record.state,
      record.postalCode,
    ]
      .filter(Boolean)
      .join(', ');

    return {
      cnpj: record.cnpj,
      name: record.tradeName || record.legalName,
      phone: record.phone,
      email: record.email,
      address: address || undefined,
      city: record.city,
      neighborhood: record.neighborhood,
      category: record.primaryCnaeDescription,
      latitude: record.latitude,
      longitude: record.longitude,
      source: 'brasilapi',
      rawData: record.rawData,
    };
  }

  private buildSearchTerms(
    params: CompanyDiscoveryParams,
    cnaeClasses: Array<{ id: string; description: string }>,
  ): string[] {
    const terms = new Set<string>();

    const queryValue = params.queryValue.trim();
    const city = params.city.trim();

    if (params.queryType === 'NICHO') {
      terms.add(queryValue);
      terms.add(`${queryValue} ${city}`);
      terms.add(`empresa ${queryValue} ${city}`);
    } else if (!this.looksLikeCnaeCode(queryValue)) {
      terms.add(`${queryValue} ${city}`);
    }

    for (const cnae of cnaeClasses) {
      const simplified = this.simplifyCnaeDescription(cnae.description);
      terms.add(simplified);
      terms.add(`${simplified} ${city}`);
      if (params.queryType === 'NICHO') {
        terms.add(`${queryValue} ${simplified} ${city}`);
      }
    }

    if (terms.size === 0) {
      terms.add(`empresa ${city}`);
    }

    return Array.from(terms).filter(Boolean);
  }

  private simplifyCnaeDescription(description: string): string {
    const words = description
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);

    return words.slice(0, 4).join(' ');
  }

  private extractCnpjs(value: string): string[] {
    const matches = value.match(/\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) ?? [];
    return Array.from(
      new Set(matches.map((item) => item.replace(/\D/g, '')).filter((item) => item.length === 14)),
    );
  }

  private matchesCnae(
    record: { primaryCnaeCode?: string; secondaryCnaeCodes: string[] },
    cnaeCodes: string[],
  ): boolean {
    if (cnaeCodes.length === 0) {
      return true;
    }

    const companyCodes = [
      record.primaryCnaeCode,
      ...record.secondaryCnaeCodes,
    ].filter(Boolean) as string[];

    const strictTargets = cnaeCodes.filter((code) => code.length === 7);
    const prefixTargets = cnaeCodes.filter((code) => code.length < 7);

    if (strictTargets.length > 0) {
      const strictHit = strictTargets.some((target) =>
        companyCodes.some((code) => code === target),
      );
      if (!strictHit) {
        return false;
      }
    }

    if (prefixTargets.length === 0) {
      return strictTargets.length > 0;
    }

    return prefixTargets.some((target) =>
      companyCodes.some(
        (code) =>
          code === target ||
          code.startsWith(target) ||
          target.startsWith(code),
      ),
    );
  }

  private looksLikeCnaeCode(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 4;
  }

  private isActive(status?: string): boolean {
    if (!status) {
      return true;
    }

    const normalized = status.trim().toUpperCase();
    return ACTIVE_STATUS_CODES.has(normalized) || normalized.includes('ATIV');
  }

  private matchesCompanyLocation(
    record: { city?: string; state?: string },
    city: string,
    uf: string,
  ): boolean {
    const normalizedCity = this.normalizeText(city);
    const normalizedUf = uf.trim().toUpperCase();
    const recordCity = this.normalizeText(record.city ?? '');
    const recordUf = record.state?.trim().toUpperCase() ?? '';

    if (recordUf && recordUf !== normalizedUf) {
      return false;
    }

    if (!recordCity) {
      return true;
    }

    return recordCity.includes(normalizedCity) || normalizedCity.includes(recordCity);
  }

  private matchesLocation(
    candidate: DiscoveredCompanyCandidate,
    params: CompanyDiscoveryParams,
  ): boolean {
    const haystack = this.normalizeText(
      [candidate.address, candidate.city, candidate.name].filter(Boolean).join(' '),
    );
    const city = this.normalizeText(params.city);
    const uf = params.uf.trim().toUpperCase();
    const stateName = BRAZIL_STATE_NAMES[uf] ?? '';

    const matchesCity =
      haystack.includes(city) ||
      this.normalizeText(candidate.city ?? '').includes(city) ||
      city.includes(this.normalizeText(candidate.city ?? ''));

    if (!matchesCity) {
      return false;
    }

    if (!stateName) {
      return true;
    }

    return haystack.includes(stateName);
  }

  private buildKey(candidate: DiscoveredCompanyCandidate): string {
    return candidate.cnpj ?? `${candidate.name}:${candidate.address ?? ''}`;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private extractContactFromPlace(
    place: { extratags?: Record<string, string> },
    field: 'phone' | 'website',
  ): string | undefined {
    const extratags = place.extratags ?? {};
    const keys =
      field === 'phone'
        ? ['phone', 'contact:phone', 'contact:mobile']
        : ['website', 'contact:website', 'url'];

    for (const key of keys) {
      const value = extratags[key]?.trim();
      if (value) {
        return value;
      }
    }

    return undefined;
  }
}
