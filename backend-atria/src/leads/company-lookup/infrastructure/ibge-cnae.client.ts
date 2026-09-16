import { Injectable, Logger } from '@nestjs/common';
import { CompanyDiscoveryError } from '../domain/company-lookup.errors';
import type { CnaeClassInfo } from '../domain/company-lookup.types';

const BASE_URL = 'https://brasilapi.com.br/api/ibge/cnae/v1/classes';
const REQUEST_TIMEOUT_MS = 60_000;

interface BrasilApiCnaeClass {
  id?: string;
  descricao?: string;
}

@Injectable()
export class IbgeCnaeClient {
  private readonly logger = new Logger(IbgeCnaeClient.name);
  private cache: CnaeClassInfo[] | null = null;

  async listClasses(): Promise<CnaeClassInfo[]> {
    if (this.cache) {
      return this.cache;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(BASE_URL, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new CompanyDiscoveryError(
          `IBGE CNAE list failed with status ${response.status}: ${body.slice(0, 200)}`,
        );
      }

      const data = (await response.json()) as BrasilApiCnaeClass[];
      this.cache = data
        .map((item) => ({
          id: this.normalizeCnaeCode(item.id ?? ''),
          description: item.descricao?.trim() || '',
        }))
        .filter((item) => item.id && item.description);

      return this.cache;
    } catch (error) {
      if (error instanceof CompanyDiscoveryError) {
        throw error;
      }

      this.logger.warn(`IBGE CNAE list failed: ${String(error)}`);
      throw new CompanyDiscoveryError('IBGE CNAE list failed', error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeCnaeCode(value: string): string {
    return value.replace(/\D/g, '');
  }
}
