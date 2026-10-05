import { Injectable, Logger } from '@nestjs/common';
import { CompanyDiscoveryError } from '../domain/company-lookup.errors';
import type { CnaeClassInfo } from '../domain/company-lookup.types';

const CLASSES_URL = 'https://brasilapi.com.br/api/ibge/cnae/v1/classes';
const SUBCLASSES_URL = 'https://servicodados.ibge.gov.br/api/v2/cnae/subclasses';
const REQUEST_TIMEOUT_MS = 60_000;

interface BrasilApiCnaeClass {
  id?: string;
  descricao?: string;
}

@Injectable()
export class IbgeCnaeClient {
  private readonly logger = new Logger(IbgeCnaeClient.name);
  private classCache: CnaeClassInfo[] | null = null;
  private subclassCache: CnaeClassInfo[] | null = null;

  async listClasses(): Promise<CnaeClassInfo[]> {
    if (this.classCache) {
      return this.classCache;
    }

    this.classCache = await this.fetchCnaeList(CLASSES_URL);
    return this.classCache;
  }

  async listSubclasses(): Promise<CnaeClassInfo[]> {
    if (this.subclassCache) {
      return this.subclassCache;
    }

    this.subclassCache = await this.fetchCnaeList(SUBCLASSES_URL);
    return this.subclassCache;
  }

  private async fetchCnaeList(url: string): Promise<CnaeClassInfo[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
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
      return data
        .map((item) => ({
          id: this.normalizeCnaeCode(item.id ?? ''),
          description: this.prettyDescription(item.descricao ?? ''),
        }))
        .filter((item) => item.id && item.description);
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

  private prettyDescription(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    const lower = trimmed.toLocaleLowerCase('pt-BR');
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  private normalizeCnaeCode(value: string): string {
    return value.replace(/\D/g, '');
  }
}
