import { Injectable } from '@nestjs/common';
import { Prisma, ProspectCompany, ProspectFitVerdict } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { DiscoveredCompanyCandidate } from '../domain/company-lookup.types';
import { normalizeCatalogText } from '../domain/text-normalize';
import { qualifyRegistryCompany } from '../../qualification/registry-company-qualifier';

export const DEFAULT_CATALOG_MAX_RESULTS = 100;
export const CATALOG_MAX_RESULTS_LIMIT = 100;

export interface CatalogSearchParams {
  queryValue: string;
  city: string;
  uf: string;
  neighborhood?: string;
  cnaeCodes: string[];
  maxResults?: number;
}

export interface CatalogCandidate extends DiscoveredCompanyCandidate {
  aiScore: number;
  aiNotes: string;
}

type CnaeMode = 'exact' | 'prefix';

@Injectable()
export class ProspectCompanyCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async search(params: CatalogSearchParams): Promise<CatalogCandidate[]> {
    const take = this.resolveLimit(params.maxResults);
    const uf = params.uf.trim().toUpperCase();
    const cityNormalized = normalizeCatalogText(params.city);
    const neighborhoodNormalized = params.neighborhood
      ? normalizeCatalogText(params.neighborhood)
      : '';
    const exactCodes = this.uniqueCodes(params.cnaeCodes, 7);
    const prefixes = this.uniquePrefixes(params.cnaeCodes, params.queryValue);

    const collected: ProspectCompany[] = [];
    const seen = new Set<string>();

    const stages: Array<{
      useCity: boolean;
      useNeighborhood: boolean;
      cnaeMode: CnaeMode;
    }> = [
      {
        useCity: true,
        useNeighborhood: Boolean(neighborhoodNormalized),
        cnaeMode: 'exact',
      },
      { useCity: true, useNeighborhood: false, cnaeMode: 'exact' },
      { useCity: true, useNeighborhood: false, cnaeMode: 'prefix' },
      { useCity: false, useNeighborhood: false, cnaeMode: 'exact' },
      { useCity: false, useNeighborhood: false, cnaeMode: 'prefix' },
    ];

    for (const stage of stages) {
      if (collected.length >= take) {
        break;
      }
      if (stage.useNeighborhood && !neighborhoodNormalized) {
        continue;
      }
      if (stage.cnaeMode === 'prefix' && exactCodes.length === 0) {
        continue;
      }
      if (
        stage.cnaeMode === 'exact' &&
        exactCodes.length === 0 &&
        prefixes.length === 0
      ) {
        continue;
      }

      const rows = await this.prisma.prospectCompany.findMany({
        where: this.buildWhere({
          uf,
          cityNormalized: stage.useCity ? cityNormalized : '',
          neighborhoodNormalized: stage.useNeighborhood
            ? neighborhoodNormalized
            : '',
          exactCodes,
          prefixes,
          cnaeMode: stage.cnaeMode,
          excludeCnpjs: [...seen],
        }),
        orderBy: { blendedScore: 'desc' },
        take: take - collected.length,
      });

      for (const row of rows) {
        if (seen.has(row.cnpj)) {
          continue;
        }
        seen.add(row.cnpj);
        collected.push(row);
      }
    }

    return collected.map((row) => this.toCandidate(row));
  }

  private buildWhere(input: {
    uf: string;
    cityNormalized: string;
    neighborhoodNormalized: string;
    exactCodes: string[];
    prefixes: string[];
    cnaeMode: CnaeMode;
    excludeCnpjs: string[];
  }): Prisma.ProspectCompanyWhereInput {
    return {
      uf: input.uf,
      verdict: { not: ProspectFitVerdict.do_not_prioritize },
      ...(input.excludeCnpjs.length > 0
        ? { cnpj: { notIn: input.excludeCnpjs } }
        : {}),
      AND: [
        input.cityNormalized
          ? {
              OR: [
                { cityNormalized: input.cityNormalized },
                { cityNormalized: { contains: input.cityNormalized } },
              ],
            }
          : {},
        input.neighborhoodNormalized
          ? {
              neighborhoodNormalized: {
                contains: input.neighborhoodNormalized,
              },
            }
          : {},
        this.buildCnaeFilter(
          input.cnaeMode === 'exact' ? input.exactCodes : [],
          input.cnaeMode === 'prefix' || input.exactCodes.length === 0
            ? input.prefixes
            : [],
        ),
      ],
    };
  }

  private buildCnaeFilter(
    exactCodes: string[],
    prefixes: string[],
  ): Prisma.ProspectCompanyWhereInput {
    const or: Prisma.ProspectCompanyWhereInput[] = [];

    for (const code of exactCodes) {
      or.push({ primaryCnae: code });
      or.push({ secondaryCnaes: { has: code } });
    }

    for (const prefix of prefixes) {
      or.push({ primaryCnae: { startsWith: prefix } });
    }

    if (or.length === 0) {
      return {};
    }

    return { OR: or };
  }

  private uniqueCodes(codes: string[], minLength: number): string[] {
    return Array.from(
      new Set(
        codes
          .map((code) => code.replace(/\D/g, ''))
          .filter((code) => code.length >= minLength),
      ),
    );
  }

  private uniquePrefixes(codes: string[], queryValue: string): string[] {
    const fromCodes = this.uniqueCodes(codes, 5).map((code) =>
      code.slice(0, 5),
    );
    const fromQuery = queryValue.replace(/\D/g, '');
    if (fromQuery.length >= 5) {
      fromCodes.push(fromQuery.slice(0, 5));
    }
    return Array.from(new Set(fromCodes.filter((code) => code.length >= 5)));
  }

  private toCandidate(row: ProspectCompany): CatalogCandidate {
    const name = row.tradeName?.trim() || row.legalName;
    const qualification = qualifyRegistryCompany({
      name,
      category: row.primaryCnaeDescription,
      phone: row.phone,
      email: row.email,
      shareCapital: row.shareCapital,
      isMei: row.isMei,
      companySize: row.companySize,
    });

    return {
      cnpj: row.cnpj,
      name,
      phone: row.phone,
      email: row.email ?? undefined,
      address: row.address ?? undefined,
      city: row.city,
      neighborhood: row.neighborhood ?? undefined,
      category: row.primaryCnaeDescription ?? undefined,
      placeId: `cnpj:${row.cnpj}`,
      source: row.source,
      aiScore: row.blendedScore,
      aiNotes: row.notes ?? qualification.notes,
      rawData: {
        cnpj: row.cnpj,
        legalName: row.legalName,
        tradeName: row.tradeName,
        primaryCnae: row.primaryCnae,
        primaryCnaeDescription: row.primaryCnaeDescription,
        secondaryCnaes: row.secondaryCnaes,
        shareCapital: row.shareCapital,
        companySize: row.companySize,
        isMei: row.isMei,
        isSimples: row.isSimples,
        capital_social: row.shareCapital,
        razao_social: row.legalName,
        nome_fantasia: row.tradeName,
        registryScore: row.registryScore,
        commercialScore: row.commercialScore,
        blendedScore: row.blendedScore,
        qualified: row.qualified,
        commercialFit: qualification.commercialFit,
        registrySnapshot: {
          cnpj: row.cnpj,
          capitalSocial: row.shareCapital,
          legalName: row.legalName,
          fetchedAt: row.ingestedAt.toISOString(),
        },
      },
    };
  }

  private resolveLimit(maxResults?: number) {
    if (!maxResults || maxResults <= 0) {
      return DEFAULT_CATALOG_MAX_RESULTS;
    }
    return Math.min(CATALOG_MAX_RESULTS_LIMIT, Math.round(maxResults));
  }
}
