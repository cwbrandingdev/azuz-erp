import {
  BadGatewayException,
  Injectable,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { CompanySettingsService } from '../../company-settings/company-settings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FetchMapsLeadsDto } from '../dto/fetch-maps-leads.dto';
import {
  buildApifyActorInput,
  mapApifyPlaces,
} from './apify-place.mapper';
import type { MappedPlace } from './maps-scraper.types';

const OUTSCRAPER_TIMEOUT_MS = 180_000;
const OUTSCRAPER_LIMIT = 25;
const APIFY_TIMEOUT_MS = 180_000;
const APIFY_DEFAULT_MAX_RESULTS = 25;
const APIFY_MAX_RESULTS_LIMIT = 120;

interface OutscraperPlace {
  name?: string;
  phone?: string;
  email?: string;
  site?: string;
  full_address?: string;
  address?: string;
  city?: string;
  borough?: string;
  neighborhood?: string;
  category?: string;
  type?: string;
  place_id?: string;
  rating?: number;
  reviews?: number;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}

@Injectable()
export class MapsScraperService {
  private readonly logger = new Logger(MapsScraperService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly companySettings: CompanySettingsService,
  ) {}

  async fetchPlaces(dto: FetchMapsLeadsDto): Promise<MappedPlace[]> {
    const credentials = await this.resolveScraperCredentials();

    if (credentials.apifyApiToken) {
      return this.fetchFromApify(dto, credentials.apifyApiToken);
    }

    const outscraperKey = this.configService.get<string>('OUTSCRAPER_API_KEY');
    if (outscraperKey?.trim()) {
      return this.fetchFromOutscraper(dto, outscraperKey.trim());
    }

    return this.findLocalMappedPlaces(dto);
  }

  private async resolveScraperCredentials() {
    let tenantApifyApiToken: string | null = null;

    try {
      const credentials =
        await this.companySettings.getScraperCredentialsForCurrentTenant();
      tenantApifyApiToken = credentials.apifyApiToken;
    } catch {}

    return {
      apifyApiToken:
        tenantApifyApiToken?.trim() ||
        this.configService.get<string>('APIFY_API_TOKEN')?.trim() ||
        null,
    };
  }

  private async fetchFromOutscraper(
    dto: FetchMapsLeadsDto,
    apiKey: string,
  ): Promise<MappedPlace[]> {
    const query = `${dto.category}, ${dto.neighborhood}, ${dto.city}`;
    const params = new URLSearchParams({
      query,
      limit: String(OUTSCRAPER_LIMIT),
      async: 'false',
      language: 'pt',
      region: 'br',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OUTSCRAPER_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://api.outscraper.com/google-maps-search?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': apiKey,
            Accept: 'application/json',
          },
          signal: controller.signal,
        },
      );

      const bodyText = await response.text();
      let body: unknown;
      try {
        body = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        body = bodyText;
      }

      if (!response.ok) {
        this.logger.warn(
          `Outscraper error ${response.status}: ${bodyText.slice(0, 500)}`,
        );
        throw new BadGatewayException(
          'Falha ao buscar lugares no Outscraper. Tente novamente.',
        );
      }

      return this.mapOutscraperPlaces(body, dto);
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException(
          'A busca no Outscraper excedeu o tempo limite. Tente novamente.',
        );
      }

      this.logger.warn(`Outscraper request failed: ${String(error)}`);
      throw new BadGatewayException('Não foi possível conectar ao Outscraper.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchFromApify(
    dto: FetchMapsLeadsDto,
    token: string,
  ): Promise<MappedPlace[]> {
    const actorId =
      this.configService.get<string>('APIFY_GOOGLE_MAPS_ACTOR') ??
      'compass~crawler-google-places';
    const payload = this.buildApifyActorInput(dto);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), APIFY_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      const bodyText = await response.text();
      let body: unknown;
      try {
        body = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        body = bodyText;
      }

      if (!response.ok) {
        this.logger.warn(
          `Apify error ${response.status}: ${bodyText.slice(0, 500)}`,
        );
        throw new BadGatewayException(
          this.extractApifyErrorMessage(body) ??
            'Falha ao buscar lugares no Apify. Tente novamente.',
        );
      }

      return mapApifyPlaces(body, dto);
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException(
          'A busca no Apify excedeu o tempo limite. Tente novamente.',
        );
      }

      this.logger.warn(`Apify request failed: ${String(error)}`);
      throw new BadGatewayException('Não foi possível conectar ao Apify.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildApifyActorInput(dto: FetchMapsLeadsDto) {
    return buildApifyActorInput(dto, this.resolveApifyMaxResults());
  }

  private resolveApifyMaxResults() {
    const configured = Number(
      this.configService.get<string>('APIFY_MAX_RESULTS'),
    );
    if (!Number.isFinite(configured) || configured <= 0) {
      return APIFY_DEFAULT_MAX_RESULTS;
    }

    return Math.min(
      APIFY_MAX_RESULTS_LIMIT,
      Math.max(1, Math.round(configured)),
    );
  }

  private extractApifyErrorMessage(body: unknown) {
    if (typeof body !== 'object' || body === null) {
      return null;
    }

    const record = body as Record<string, unknown>;
    const error = record.error;
    if (typeof error === 'object' && error !== null) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }

    const message = record.message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }

    return null;
  }

  private async findLocalMappedPlaces(
    dto: FetchMapsLeadsDto,
  ): Promise<MappedPlace[]> {
    const leads = await this.prisma.lead.findMany({
      where: {
        deletedAt: null,
        AND: [
          {
            OR: [
              { city: { contains: dto.city, mode: 'insensitive' } },
              {
                neighborhood: {
                  contains: dto.neighborhood,
                  mode: 'insensitive',
                },
              },
              { category: { contains: dto.category, mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return leads.map((lead) => ({
      name: lead.name,
      phone: lead.phone ?? undefined,
      email: lead.email ?? undefined,
      website: lead.website ?? undefined,
      address: lead.address ?? undefined,
      city: lead.city ?? dto.city,
      neighborhood: lead.neighborhood ?? dto.neighborhood,
      category: lead.category ?? dto.category,
      placeId: lead.placeId ?? undefined,
      rating: lead.rating ?? undefined,
      reviewsCount: lead.reviewsCount ?? undefined,
      latitude: lead.latitude ?? undefined,
      longitude: lead.longitude ?? undefined,
      source: 'local',
      rawData: (lead.rawData as Prisma.InputJsonValue) ?? {
        id: lead.id,
        source: 'local',
      },
    }));
  }

  private mapOutscraperPlaces(
    body: unknown,
    dto: FetchMapsLeadsDto,
  ): MappedPlace[] {
    const places = this.flattenPlaces(body) as OutscraperPlace[];
    const mapped: MappedPlace[] = [];

    for (const place of places) {
      const name =
        typeof place.name === 'string' && place.name.trim()
          ? place.name.trim()
          : null;
      if (!name) continue;

      mapped.push({
        name,
        phone: this.asOptionalString(place.phone),
        email: this.asOptionalString(place.email),
        website: this.asOptionalString(place.site),
        address: this.asOptionalString(place.full_address ?? place.address),
        city: this.asOptionalString(place.city) ?? dto.city,
        neighborhood:
          this.asOptionalString(place.borough ?? place.neighborhood) ??
          dto.neighborhood,
        category:
          this.asOptionalString(place.category ?? place.type) ?? dto.category,
        placeId: this.asOptionalString(place.place_id),
        rating: typeof place.rating === 'number' ? place.rating : undefined,
        reviewsCount:
          typeof place.reviews === 'number' ? place.reviews : undefined,
        latitude:
          typeof place.latitude === 'number' ? place.latitude : undefined,
        longitude:
          typeof place.longitude === 'number' ? place.longitude : undefined,
        source: 'outscraper',
        rawData: place as Prisma.InputJsonValue,
      });
    }

    return mapped;
  }

  private flattenPlaces(body: unknown): unknown[] {
    if (Array.isArray(body)) {
      if (body.length > 0 && Array.isArray(body[0])) {
        return body.flat();
      }
      return body;
    }

    if (typeof body !== 'object' || body === null) {
      return [];
    }

    const record = body as Record<string, unknown>;
    const data = record.data;

    if (Array.isArray(data)) {
      if (data.length > 0 && Array.isArray(data[0])) {
        return data.flat();
      }
      return data;
    }

    return [];
  }

  private asOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
  }
}
