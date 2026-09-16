import { Injectable, Logger } from '@nestjs/common';
import { BrasilApiCnpjClient } from '../infrastructure/brasil-api-cnpj.client';
import { MinhaReceitaClient } from '../infrastructure/minha-receita.client';
import { NominatimClient } from '../infrastructure/nominatim.client';
import type { CompanyLookupRecord } from '../domain/company-lookup.types';

@Injectable()
export class CompanyLookupService {
  private readonly logger = new Logger(CompanyLookupService.name);

  constructor(
    private readonly brasilApiCnpjClient: BrasilApiCnpjClient,
    private readonly minhaReceitaClient: MinhaReceitaClient,
    private readonly nominatimClient: NominatimClient,
  ) {}

  async lookup(cnpj: string): Promise<CompanyLookupRecord | null> {
    const normalized = cnpj.replace(/\D/g, '');
    if (normalized.length !== 14) {
      return null;
    }

    try {
      const fromBrasilApi = await this.brasilApiCnpjClient.lookup(normalized);
      if (fromBrasilApi) {
        return this.withGeocoding(fromBrasilApi);
      }
    } catch (error) {
      this.logger.warn(`BrasilAPI lookup failed for ${normalized}: ${String(error)}`);
    }

    try {
      const fromMinhaReceita = await this.minhaReceitaClient.lookup(normalized);
      if (fromMinhaReceita) {
        return this.withGeocoding(fromMinhaReceita);
      }
    } catch (error) {
      this.logger.warn(`Minha Receita lookup failed for ${normalized}: ${String(error)}`);
    }

    return null;
  }

  async withGeocoding(
    record: CompanyLookupRecord,
  ): Promise<CompanyLookupRecord> {
    if (record.latitude !== undefined && record.longitude !== undefined) {
      return record;
    }

    const address = this.buildAddress(record);
    if (!address) {
      return record;
    }

    try {
      const geocoded = await this.nominatimClient.geocodeAddress(address);
      if (!geocoded) {
        return record;
      }

      return {
        ...record,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
      };
    } catch (error) {
      this.logger.warn(`Geocoding failed for ${record.cnpj}: ${String(error)}`);
      return record;
    }
  }

  private buildAddress(record: CompanyLookupRecord): string | undefined {
    const parts = [
      record.street,
      record.number,
      record.neighborhood,
      record.city,
      record.state,
      record.postalCode,
      'Brasil',
    ]
      .map((part) => part?.trim())
      .filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : undefined;
  }
}
