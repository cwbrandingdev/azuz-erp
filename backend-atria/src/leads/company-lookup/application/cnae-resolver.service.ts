import { Injectable } from '@nestjs/common';
import { IbgeCnaeClient } from '../infrastructure/ibge-cnae.client';
import type {
  CnaeClassInfo,
  LeadSearchQueryTypeValue,
} from '../domain/company-lookup.types';

const CNAE_SEARCH_DEFAULT_LIMIT = 30;

/** Subclasses CNAE (7 dígitos) — a API IBGE só expõe classes (ex.: 96025). */
const CNAE_SUBCLASS_DESCRIPTIONS: Record<string, string> = {
  '9602501':
    'Cabeleireiros, barbearia, manicure e pedicure',
  '9602502':
    'Atividades de estética e outros serviços de cuidados com a beleza',
};

@Injectable()
export class CnaeResolverService {
  constructor(private readonly ibgeCnaeClient: IbgeCnaeClient) {}

  async search(query: string, limit = CNAE_SEARCH_DEFAULT_LIMIT) {
    const normalizedQuery = query.trim();
    const classes = await this.ibgeCnaeClient.listClasses();

    if (!normalizedQuery) {
      return classes.slice(0, limit).map((item) => ({
        id: item.id,
        description: item.description,
      }));
    }

    const normalizedCode = this.normalizeCnaeCode(normalizedQuery);
    const normalizedText = this.normalizeText(normalizedQuery);

    const matches = classes.filter((item) => {
      const codeMatch =
        normalizedCode.length > 0 && this.codesMatch(normalizedCode, item.id);
      const descriptionMatch = this.normalizeText(item.description).includes(
        normalizedText,
      );
      return codeMatch || descriptionMatch;
    });

    const results: CnaeClassInfo[] = matches.map((item) => ({
      id: item.id,
      description: item.description,
    }));

    if (normalizedCode.length === 7) {
      const subclass = this.subclassInfo(normalizedCode);
      if (subclass && !results.some((item) => item.id === subclass.id)) {
        results.unshift(subclass);
      }
    }

    return results.slice(0, limit);
  }

  async resolve(
    queryType: LeadSearchQueryTypeValue,
    queryValue: string,
  ): Promise<CnaeClassInfo[]> {
    const normalizedQuery = queryValue.trim();
    const classes = await this.ibgeCnaeClient.listClasses();

    if (queryType === 'CNAE') {
      const targetCode = this.normalizeCnaeCode(normalizedQuery);
      const ibgeMatches = classes.filter((item) =>
        this.codesMatch(targetCode, item.id),
      );

      const resolved: CnaeClassInfo[] = [];

      if (targetCode.length === 7) {
        const subclass = this.subclassInfo(targetCode);
        if (subclass) {
          resolved.push(subclass);
        }
      }

      const bestIbge = this.pickMostSpecific(ibgeMatches);
      if (bestIbge) {
        resolved.push(bestIbge);
      }

      if (resolved.length > 0) {
        return resolved;
      }

      return [
        {
          id: targetCode,
          description:
            this.subclassInfo(targetCode)?.description ??
            `CNAE ${this.formatSubclassCode(targetCode)}`,
        },
      ];
    }

    const normalizedNiche = this.normalizeText(normalizedQuery);
    const matches = classes.filter((item) =>
      this.normalizeText(item.description).includes(normalizedNiche),
    );

    return matches.slice(0, 5);
  }

  /** Termo curto para Lead Miner / mapas (evita descrição IBGE gigante). */
  leadMinerCategory(queryValue: string, resolved: CnaeClassInfo[]): string {
    const targetCode = this.normalizeCnaeCode(queryValue.trim());
    if (targetCode.length === 7) {
      const subclass = this.subclassInfo(targetCode);
      if (subclass) {
        return this.leadMinerTermFromSubclass(targetCode, subclass.description);
      }
    }

    const best = this.pickMostSpecific(resolved) ?? resolved[0];
    if (!best?.description) {
      return queryValue.trim();
    }

    return this.simplifyForLeadMiner(best.description);
  }

  /** Códigos usados para filtrar CNPJ na Receita (subclasse exige match exato). */
  cnaeFilterCodes(resolved: CnaeClassInfo[]): string[] {
    const codes = resolved.map((item) => this.normalizeCnaeCode(item.id));
    return Array.from(new Set(codes.filter(Boolean)));
  }

  formatSubclassCode(digits: string): string {
    const code = this.normalizeCnaeCode(digits);
    if (code.length !== 7) {
      return digits;
    }
    return `${code.slice(0, 2)}.${code.slice(2, 4)}-${code[4]}/${code.slice(5, 7)}`;
  }

  private subclassInfo(code: string): CnaeClassInfo | null {
    const normalized = this.normalizeCnaeCode(code);
    if (normalized.length !== 7) {
      return null;
    }

    const description = CNAE_SUBCLASS_DESCRIPTIONS[normalized];
    if (!description) {
      return {
        id: normalized,
        description: `Subclasse CNAE ${this.formatSubclassCode(normalized)}`,
      };
    }

    return {
      id: normalized,
      description,
    };
  }

  private leadMinerTermFromSubclass(code: string, description: string): string {
    if (code === '9602502') {
      return 'clínica de estética';
    }
    if (code === '9602501') {
      return 'salão de beleza';
    }

    const firstSegment = description.split(/\s+e\s+/i)[0]?.trim();
    return firstSegment ? this.simplifyForLeadMiner(firstSegment) : 'estética';
  }

  private simplifyForLeadMiner(description: string): string {
    const words = description
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3 && !/^outras?$/.test(word));

    return words.slice(0, 3).join(' ') || description.slice(0, 40);
  }

  private pickMostSpecific(matches: CnaeClassInfo[]): CnaeClassInfo | null {
    if (matches.length === 0) {
      return null;
    }
    return matches.reduce((best, item) =>
      item.id.length > best.id.length ? item : best,
    );
  }

  private codesMatch(targetCode: string, itemId: string): boolean {
    return (
      itemId === targetCode ||
      itemId.startsWith(targetCode) ||
      targetCode.startsWith(itemId)
    );
  }

  private normalizeCnaeCode(value: string): string {
    return value.replace(/\D/g, '');
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
