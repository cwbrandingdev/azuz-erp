import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IbgeCnaeClient } from '../infrastructure/ibge-cnae.client';
import { normalizeCatalogText } from '../domain/text-normalize';
import type {
  CnaeClassInfo,
  LeadSearchQueryTypeValue,
} from '../domain/company-lookup.types';

const CNAE_SEARCH_DEFAULT_LIMIT = 40;

/** Fallback if the Receita subclass table is still empty. */
const CNAE_SUBCLASS_DESCRIPTIONS: Record<string, string> = {
  '9602501':
    'Cabeleireiros, barbearia, manicure e pedicure',
  '9602502':
    'Atividades de estética e outros serviços de cuidados com a beleza',
};

@Injectable()
export class CnaeResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ibgeCnaeClient: IbgeCnaeClient,
  ) {}

  async search(query: string, limit = CNAE_SEARCH_DEFAULT_LIMIT) {
    const catalog = await this.loadCatalog();
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return catalog.slice(0, limit);
    }

    const normalizedCode = this.normalizeCnaeCode(normalizedQuery);
    const normalizedText = this.normalizeText(normalizedQuery);

    const matches = catalog.filter((item) => {
      const codeMatch =
        normalizedCode.length > 0 &&
        (item.id.includes(normalizedCode) ||
          this.codesMatch(normalizedCode, item.id));
      const descriptionMatch = this.normalizeText(item.description).includes(
        normalizedText,
      );
      return codeMatch || descriptionMatch;
    });

    matches.sort((left, right) => {
      const delta =
        this.rankMatch(right, normalizedCode, normalizedText) -
        this.rankMatch(left, normalizedCode, normalizedText);
      if (delta !== 0) {
        return delta;
      }
      return left.description.localeCompare(right.description, 'pt-BR');
    });

    return matches.slice(0, limit);
  }

  async resolve(
    _queryType: LeadSearchQueryTypeValue,
    queryValue: string,
  ): Promise<CnaeClassInfo[]> {
    const catalog = await this.loadCatalog();
    const normalizedQuery = queryValue.trim();
    const targetCode = this.normalizeCnaeCode(normalizedQuery);

    if (targetCode.length >= 5) {
      const exact = catalog.filter(
        (item) =>
          item.id === targetCode ||
          (targetCode.length < 7 && item.id.startsWith(targetCode)),
      );
      if (exact.length > 0) {
        return exact;
      }

      return [
        {
          id: targetCode,
          description:
            catalog.find((item) => item.id === targetCode)?.description ??
            CNAE_SUBCLASS_DESCRIPTIONS[targetCode] ??
            `CNAE ${this.formatSubclassCode(targetCode)}`,
        },
      ];
    }

    const normalizedText = this.normalizeText(normalizedQuery);
    const matches = catalog.filter((item) =>
      this.normalizeText(item.description).includes(normalizedText),
    );
    return matches.slice(0, 12);
  }

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

  private async loadCatalog(): Promise<CnaeClassInfo[]> {
    const rows = await this.prisma.prospectCnae.findMany({
      orderBy: { code: 'asc' },
    });

    const unique = new Map<string, CnaeClassInfo>();
    for (const row of rows) {
      unique.set(row.code, {
        id: row.code,
        description: row.description,
      });
    }

    for (const [id, description] of Object.entries(CNAE_SUBCLASS_DESCRIPTIONS)) {
      if (!unique.has(id)) {
        unique.set(id, { id, description });
      }
    }

    const sevenDigitCount = [...unique.keys()].filter(
      (code) => code.length === 7,
    ).length;
    if (sevenDigitCount < 200) {
      const subclasses = await this.ibgeCnaeClient.listSubclasses().catch(() => []);
      for (const item of subclasses) {
        if (!unique.has(item.id)) {
          unique.set(item.id, item);
        }
      }
    }

    if (unique.size === 0) {
      const classes = await this.ibgeCnaeClient.listClasses().catch(() => []);
      for (const item of classes) {
        unique.set(item.id, item);
      }
    }

    return Array.from(unique.values());
  }

  private rankMatch(
    item: CnaeClassInfo,
    code: string,
    text: string,
  ): number {
    let score = 0;
    const description = this.normalizeText(item.description);

    if (code && item.id === code) {
      score += 1000;
    } else if (code && item.id.startsWith(code)) {
      score += 600;
    } else if (code && item.id.includes(code)) {
      score += 200;
    }

    if (text && description.startsWith(text)) {
      score += 800;
    } else if (text && description.includes(text)) {
      score += 400;
    }

    if (item.id.length === 7) {
      score += 80;
    }

    return score;
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
    return normalizeCatalogText(value);
  }
}
