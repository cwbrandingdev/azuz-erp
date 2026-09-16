import { Injectable } from '@nestjs/common';
import { IbgeCnaeClient } from '../infrastructure/ibge-cnae.client';
import type {
  CnaeClassInfo,
  LeadSearchQueryTypeValue,
} from '../domain/company-lookup.types';

const CNAE_SEARCH_DEFAULT_LIMIT = 30;

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
        normalizedCode.length > 0 &&
        (item.id === normalizedCode || item.id.startsWith(normalizedCode));
      const descriptionMatch = this.normalizeText(item.description).includes(
        normalizedText,
      );
      return codeMatch || descriptionMatch;
    });

    return matches.slice(0, limit).map((item) => ({
      id: item.id,
      description: item.description,
    }));
  }

  async resolve(
    queryType: LeadSearchQueryTypeValue,
    queryValue: string,
  ): Promise<CnaeClassInfo[]> {
    const normalizedQuery = queryValue.trim();
    const classes = await this.ibgeCnaeClient.listClasses();

    if (queryType === 'CNAE') {
      const targetCode = this.normalizeCnaeCode(normalizedQuery);
      const exactMatches = classes.filter(
        (item) =>
          item.id === targetCode ||
          item.id.startsWith(targetCode) ||
          targetCode.startsWith(item.id),
      );

      if (exactMatches.length > 0) {
        return exactMatches;
      }

      return [
        {
          id: targetCode,
          description: `CNAE ${targetCode}`,
        },
      ];
    }

    const normalizedNiche = this.normalizeText(normalizedQuery);
    const matches = classes.filter((item) =>
      this.normalizeText(item.description).includes(normalizedNiche),
    );

    return matches.slice(0, 5);
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
