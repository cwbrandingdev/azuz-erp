import { Injectable, Logger } from '@nestjs/common';
import { CompanyLookupError } from '../domain/company-lookup.errors';
import type { CompanyLookupRecord } from '../domain/company-lookup.types';

const BASE_URL = 'https://brasilapi.com.br/api/cnpj/v1';
const REQUEST_TIMEOUT_MS = 30_000;

interface BrasilApiCnpjResponse {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  email?: string | null;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  cnae_fiscal?: number;
  cnae_fiscal_descricao?: string;
  cnaes_secundarios?: Array<{ codigo?: number; descricao?: string }>;
  descricao_situacao_cadastral?: string;
  situacao_cadastral?: number;
  capital_social?: number;
}

@Injectable()
export class BrasilApiCnpjClient {
  private readonly logger = new Logger(BrasilApiCnpjClient.name);

  async lookup(cnpj: string): Promise<CompanyLookupRecord | null> {
    const normalized = this.normalizeCnpj(cnpj);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${BASE_URL}/${normalized}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const body = await response.text();
        throw new CompanyLookupError(
          `BrasilAPI CNPJ lookup failed with status ${response.status}: ${body.slice(0, 200)}`,
        );
      }

      const data = (await response.json()) as BrasilApiCnpjResponse;
      return this.mapResponse(data, normalized);
    } catch (error) {
      if (error instanceof CompanyLookupError) {
        throw error;
      }

      this.logger.warn(`BrasilAPI CNPJ lookup failed for ${normalized}: ${String(error)}`);
      throw new CompanyLookupError('BrasilAPI CNPJ lookup failed', error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private mapResponse(
    data: BrasilApiCnpjResponse,
    normalizedCnpj: string,
  ): CompanyLookupRecord {
    const phone = this.buildPhone(data.ddd_telefone_1 ?? data.ddd_telefone_2);
    const secondaryCnaeCodes = (data.cnaes_secundarios ?? [])
      .map((item) => this.normalizeCnaeCode(String(item.codigo ?? '')))
      .filter(Boolean);

    return {
      cnpj: this.normalizeCnpj(data.cnpj ?? normalizedCnpj),
      legalName: data.razao_social?.trim() || normalizedCnpj,
      tradeName: data.nome_fantasia?.trim() || undefined,
      phone,
      email: data.email?.trim() || undefined,
      street: data.logradouro?.trim() || undefined,
      number: data.numero?.trim() || undefined,
      neighborhood: data.bairro?.trim() || undefined,
      city: data.municipio?.trim() || undefined,
      state: data.uf?.trim()?.toUpperCase() || undefined,
      postalCode: data.cep?.trim() || undefined,
      primaryCnaeCode: this.normalizeCnaeCode(String(data.cnae_fiscal ?? '')),
      primaryCnaeDescription: data.cnae_fiscal_descricao?.trim() || undefined,
      secondaryCnaeCodes,
      registrationStatus:
        data.descricao_situacao_cadastral?.trim() ||
        String(data.situacao_cadastral ?? ''),
      shareCapital: this.parseShareCapital(data.capital_social),
      rawData: data as Record<string, unknown>,
    };
  }

  private parseShareCapital(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
    return undefined;
  }

  private buildPhone(value?: string): string | undefined {
    if (!value?.trim()) {
      return undefined;
    }

    const digits = value.replace(/\D/g, '');
    if (!digits) {
      return undefined;
    }

    if (digits.length === 10 || digits.length === 11) {
      const ddd = digits.slice(0, 2);
      const rest = digits.slice(2);
      if (rest.length === 8) {
        return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
      }
      if (rest.length === 9) {
        return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
      }
    }

    return digits;
  }

  private normalizeCnpj(value: string): string {
    return value.replace(/\D/g, '');
  }

  private normalizeCnaeCode(value: string): string {
    return value.replace(/\D/g, '');
  }
}
