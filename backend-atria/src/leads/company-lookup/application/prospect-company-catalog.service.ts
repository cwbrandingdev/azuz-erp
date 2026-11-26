import { Injectable } from '@nestjs/common';
import { Prisma, ProspectCompany } from '@prisma/catalog-client';
import { CatalogPrismaService } from '../../../prisma/catalog-prisma.service';
import type { DiscoveredCompanyCandidate } from '../domain/company-lookup.types';
import { normalizeCatalogText } from '../domain/text-normalize';
import { qualifyRegistryCompany } from '../../qualification/registry-company-qualifier';

export const CATALOG_DEFAULT_PAGE_SIZE = 25;

export interface CatalogSearchParams {
  queryValue: string;
  city: string;
  uf: string;
  neighborhood?: string;
  cnaeCodes: string[];
  page?: number;
  pageSize?: number;
  name?: string;
  openedFrom?: string;
  openedTo?: string;
  /** Hard cap used only when page/pageSize are absent (legacy). */
  maxResults?: number;
}

export interface CatalogSearchPageResult {
  items: CatalogCandidate[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface CatalogCandidate extends DiscoveredCompanyCandidate {
  aiScore: number;
  aiNotes: string;
}

type CnaeMode = 'exact' | 'prefix';

@Injectable()
export class ProspectCompanyCatalogService {
  constructor(private readonly catalogPrisma: CatalogPrismaService) {}

  async searchPage(
    params: CatalogSearchParams,
  ): Promise<CatalogSearchPageResult> {
    const page = Math.max(1, Math.round(params.page ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Math.round(params.pageSize ?? CATALOG_DEFAULT_PAGE_SIZE)),
    );
    const uf = params.uf.trim().toUpperCase();
    const cityNormalized = normalizeCatalogText(params.city);
    const neighborhoodNormalized = params.neighborhood
      ? normalizeCatalogText(params.neighborhood)
      : '';
    const exactCodes = this.uniqueCodes(params.cnaeCodes, 7);
    const prefixes = this.uniquePrefixes(params.cnaeCodes, params.queryValue);
    const name = params.name?.trim() ?? '';
    const openedFrom = this.parseDayStart(params.openedFrom);
    const openedTo = this.parseDayEnd(params.openedTo, params.openedFrom);

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

      const where = this.buildWhere({
        uf,
        cityNormalized: stage.useCity ? cityNormalized : '',
        neighborhoodNormalized: stage.useNeighborhood
          ? neighborhoodNormalized
          : '',
        exactCodes,
        prefixes,
        cnaeMode: stage.cnaeMode,
        name,
        openedFrom,
        openedTo,
      });

      const totalCount = await this.catalogPrisma.prospectCompany.count({
        where,
      });
      if (totalCount === 0) {
        continue;
      }

      const effectivePageSize =
        params.maxResults != null && params.maxResults > 0
          ? Math.min(pageSize, params.maxResults)
          : pageSize;
      const skip = (page - 1) * effectivePageSize;

      const rows = await this.catalogPrisma.prospectCompany.findMany({
        where,
        orderBy: [{ blendedScore: 'desc' }, { cnpj: 'asc' }],
        skip,
        take: effectivePageSize,
      });

      return {
        items: rows.map((row) => this.toCandidate(row)),
        totalCount:
          params.maxResults != null && params.maxResults > 0
            ? Math.min(totalCount, params.maxResults)
            : totalCount,
        page,
        pageSize: effectivePageSize,
      };
    }

    return {
      items: [],
      totalCount: 0,
      page,
      pageSize,
    };
  }

  /** Catalog search that uses only the company opening date (and an optional name). */
  async searchByOpenedAt(params: {
    name?: string;
    openedFrom?: string;
    openedTo?: string;
    page?: number;
    pageSize?: number;
  }): Promise<CatalogSearchPageResult> {
    const page = Math.max(1, Math.round(params.page ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Math.round(params.pageSize ?? CATALOG_DEFAULT_PAGE_SIZE)),
    );
    const openedFrom = this.parseDayStart(params.openedFrom);
    const openedTo = this.parseDayEnd(params.openedTo, params.openedFrom);
    const name = params.name?.trim() ?? '';

    if (!openedFrom && !openedTo) {
      return { items: [], totalCount: 0, page, pageSize };
    }

    const where: Prisma.ProspectCompanyWhereInput = {
      openedAt: {
        ...(openedFrom ? { gte: openedFrom } : {}),
        ...(openedTo ? { lte: openedTo } : {}),
      },
      ...(name
        ? {
            OR: [
              { legalName: { contains: name, mode: 'insensitive' } },
              { tradeName: { contains: name, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const skip = (page - 1) * pageSize;
    const [totalCount, rows] = await Promise.all([
      this.catalogPrisma.prospectCompany.count({ where }),
      this.catalogPrisma.prospectCompany.findMany({
        where,
        orderBy: [{ blendedScore: 'desc' }, { cnpj: 'asc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => this.toCandidate(row)),
      totalCount,
      page,
      pageSize,
    };
  }

  private buildWhere(input: {
    uf: string;
    cityNormalized: string;
    neighborhoodNormalized: string;
    exactCodes: string[];
    prefixes: string[];
    cnaeMode: CnaeMode;
    name: string;
    openedFrom: Date | null;
    openedTo: Date | null;
  }): Prisma.ProspectCompanyWhereInput {
    const nameNormalized = normalizeCatalogText(input.name);

    return {
      uf: input.uf,
      ...(input.openedFrom || input.openedTo
        ? {
            openedAt: {
              ...(input.openedFrom ? { gte: input.openedFrom } : {}),
              ...(input.openedTo ? { lte: input.openedTo } : {}),
            },
          }
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
        nameNormalized
          ? {
              OR: [
                { legalName: { contains: input.name, mode: 'insensitive' } },
                { tradeName: { contains: input.name, mode: 'insensitive' } },
              ],
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

  private parseDayStart(value?: string): Date | null {
    const day = value?.trim();
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return null;
    }
    const date = new Date(`${day}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  /** If only `openedFrom` is set, upper bound is end of today (UTC). */
  private parseDayEnd(openedTo?: string, openedFrom?: string): Date | null {
    const to = openedTo?.trim();
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      const date = new Date(`${to}T23:59:59.999Z`);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (openedFrom?.trim()) {
      const today = new Date().toISOString().slice(0, 10);
      return new Date(`${today}T23:59:59.999Z`);
    }
    return null;
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
        openedAt: row.openedAt?.toISOString() ?? null,
        data_inicio_atividade: row.openedAt?.toISOString().slice(0, 10) ?? null,
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
}
