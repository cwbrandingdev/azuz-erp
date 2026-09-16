import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeocodingError } from '../domain/company-lookup.errors';
import type { GeocodingResult } from '../domain/company-lookup.types';

const BASE_URL = 'https://nominatim.openstreetmap.org';
const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT = 'atria-erp/1.0 (contact@atria.local)';

interface NominatimSearchResult {
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  type?: string;
  class?: string;
  extratags?: Record<string, string>;
  address?: Record<string, string>;
}

@Injectable()
export class NominatimClient {
  private readonly logger = new Logger(NominatimClient.name);

  constructor(private readonly configService: ConfigService) {}

  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    const results = await this.search(address, 1);
    return results[0] ?? null;
  }

  async searchBusinesses(
    query: string,
    city: string,
    uf: string,
    limit: number,
  ): Promise<GeocodingResult[]> {
    const composedQuery = `${query}, ${city}, ${uf}, Brasil`;
    return this.search(composedQuery, limit);
  }

  async search(
    query: string,
    limit: number,
  ): Promise<GeocodingResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: String(Math.min(Math.max(limit, 1), 50)),
      });

      const response = await fetch(`${BASE_URL}/search?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': this.getUserAgent(),
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new GeocodingError(
          `Nominatim search failed with status ${response.status}: ${body.slice(0, 200)}`,
        );
      }

      const data = (await response.json()) as NominatimSearchResult[];
      return data
        .map((item) => this.mapResult(item))
        .filter((item): item is GeocodingResult => item !== null);
    } catch (error) {
      if (error instanceof GeocodingError) {
        throw error;
      }

      this.logger.warn(`Nominatim search failed: ${String(error)}`);
      throw new GeocodingError('Nominatim search failed', error);
    } finally {
      clearTimeout(timeout);
    }
  }

  extractCnpjFromExtratags(
    extratags?: Record<string, string>,
  ): string | undefined {
    if (!extratags) {
      return undefined;
    }

    const candidates = [
      extratags.cnpj,
      extratags['ref:vatin'],
      extratags.vatin,
      extratags['tax:CNPJ'],
    ];

    for (const candidate of candidates) {
      const normalized = candidate?.replace(/\D/g, '');
      if (normalized && normalized.length === 14) {
        return normalized;
      }
    }

    return undefined;
  }

  private mapResult(item: NominatimSearchResult): GeocodingResult | null {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      latitude,
      longitude,
      displayName: item.display_name?.trim() || item.name?.trim() || '',
      extratags: item.extratags,
      address: item.address,
    };
  }

  private getUserAgent(): string {
    return (
      this.configService.get<string>('NOMINATIM_USER_AGENT')?.trim() ||
      DEFAULT_USER_AGENT
    );
  }
}
