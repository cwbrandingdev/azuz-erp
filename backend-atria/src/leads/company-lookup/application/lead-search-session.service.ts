import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Lead, LeadSearchQueryType, Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../../company/company.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import type { DiscoveredCompanyCandidate } from '../domain/company-lookup.types';
import { CnaeResolverService } from './cnae-resolver.service';
import {
  CatalogCandidate,
  ProspectCompanyCatalogService,
} from './prospect-company-catalog.service';
import type { B2bLeadSearchDto } from '../dto/b2b-lead-search.dto';
import type { LeadSearchSessionQueryDto } from '../dto/lead-search-session-query.dto';
import { isProspectCatalogAllowedUf } from '../domain/prospect-catalog.constants';
import {
  extractCnpjFromLead,
  materializeRegistrySnapshotFromRawData,
} from '../../qualification/registry-signals.util';
import { CATALOG_DEFAULT_PAGE_SIZE } from './prospect-company-catalog.service';
import {
  latestCallInclude,
  type LeadWithLatestCall,
  mapLeadLastCall,
} from '../../lead-call.include';

export const CATALOG_PREVIEW_ID_PREFIX = 'external:cnpj:';

export function catalogPreviewId(cnpj: string) {
  return `${CATALOG_PREVIEW_ID_PREFIX}${cnpj}`;
}

export function isCatalogPreviewId(id: string) {
  return id.startsWith(CATALOG_PREVIEW_ID_PREFIX);
}

@Injectable()
export class LeadSearchSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prospectCatalog: ProspectCompanyCatalogService,
    private readonly cnaeResolver: CnaeResolverService,
  ) {}

  async search(tenantId: string | null | undefined, dto: B2bLeadSearchDto) {
    const resolvedTenantId = tenantId?.trim() || DEFAULT_COMPANY_ID;
    const queryType = (dto.queryType ?? 'CNAE') as LeadSearchQueryType;
    const city = dto.city.trim();
    const uf = dto.uf.trim().toUpperCase();
    const queryValue = dto.queryValue.trim();

    if (!city || !uf || !queryValue) {
      throw new BadRequestException('queryValue, city and uf are required');
    }

    if (!isProspectCatalogAllowedUf(uf)) {
      throw new BadRequestException(
        'A busca por CNAE está disponível apenas para São Paulo (SP) e Paraná (PR).',
      );
    }

    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? CATALOG_DEFAULT_PAGE_SIZE;

    const discovered = await this.discoverCandidatesPage({
      queryType,
      queryValue,
      city,
      uf,
      address: dto.address?.trim(),
      page,
      pageSize,
      maxResults: dto.maxResults,
      name: dto.name,
      openedFrom: dto.openedFrom,
      openedTo: dto.openedTo,
    });

    const session = await this.prisma.leadSearchSession.create({
      data: {
        tenantId: resolvedTenantId,
        queryType,
        queryValue,
        city,
        uf,
      },
    });

    const leads = await this.hydrateCandidates(
      resolvedTenantId,
      session.id,
      discovered.items,
    );

    return {
      session: this.toSessionResponse(session, discovered.totalCount),
      leads,
      totalCount: discovered.totalCount,
      page: discovered.page,
      pageSize: discovered.pageSize,
    };
  }

  async searchByOpeningDate(
    tenantId: string | null | undefined,
    query: LeadSearchSessionQueryDto = {},
  ) {
    const resolvedTenantId = tenantId?.trim() || DEFAULT_COMPANY_ID;
    const openedFrom = query.openedFrom?.trim();
    const openedTo = query.openedTo?.trim();

    if (!openedFrom && !openedTo) {
      throw new BadRequestException('Informe a data de abertura.');
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? CATALOG_DEFAULT_PAGE_SIZE;
    const discovered = await this.prospectCatalog.searchByOpenedAt({
      name: query.name,
      openedFrom,
      openedTo,
      city: query.city?.trim(),
      uf: query.uf?.trim(),
      page,
      pageSize,
    });
    const leads = await this.hydrateCandidates(
      resolvedTenantId,
      'opened-at',
      discovered.items,
    );

    return {
      leads,
      totalCount: discovered.totalCount,
      page: discovered.page,
      pageSize: discovered.pageSize,
    };
  }

  async listSessions(tenantId: string | null | undefined) {
    const resolvedTenantId = tenantId?.trim() || DEFAULT_COMPANY_ID;

    const sessions = await this.prisma.leadSearchSession.findMany({
      where: { tenantId: resolvedTenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      tenantId: session.tenantId,
      queryType: session.queryType,
      queryValue: session.queryValue,
      city: session.city,
      uf: session.uf,
      createdAt: session.createdAt.toISOString(),
      leadsCount: session._count.leads,
    }));
  }

  async getSessionLeads(
    tenantId: string | null | undefined,
    sessionId: string,
    query: LeadSearchSessionQueryDto = {},
  ) {
    const resolvedTenantId = tenantId?.trim() || DEFAULT_COMPANY_ID;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? CATALOG_DEFAULT_PAGE_SIZE;

    const session = await this.prisma.leadSearchSession.findFirst({
      where: {
        id: sessionId,
        tenantId: resolvedTenantId,
      },
    });

    if (!session) {
      throw new NotFoundException('Search session not found');
    }

    const linkedCount = await this.prisma.lead.count({
      where: {
        searchSessionId: session.id,
        companyId: resolvedTenantId,
        deletedAt: null,
      },
    });

    if (linkedCount > 0) {
      const linked = await this.prisma.lead.findMany({
        where: {
          searchSessionId: session.id,
          companyId: resolvedTenantId,
          deletedAt: null,
        },
        include: latestCallInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      return {
        session: this.toSessionResponse(session, linkedCount),
        leads: linked.map((lead) => this.toLeadResponse(lead)),
        totalCount: linkedCount,
        page,
        pageSize,
      };
    }

    const discovered = await this.discoverCandidatesPage({
      queryType: session.queryType,
      queryValue: session.queryValue,
      city: session.city,
      uf: session.uf,
      page,
      pageSize,
      name: query.name,
      openedFrom: query.openedFrom,
      openedTo: query.openedTo,
    });
    const leads = await this.hydrateCandidates(
      resolvedTenantId,
      session.id,
      discovered.items,
    );

    return {
      session: this.toSessionResponse(session, discovered.totalCount),
      leads,
      totalCount: discovered.totalCount,
      page: discovered.page,
      pageSize: discovered.pageSize,
    };
  }

  private async discoverCandidatesPage(params: {
    queryType: LeadSearchQueryType;
    queryValue: string;
    city: string;
    uf: string;
    address?: string;
    page?: number;
    pageSize?: number;
    maxResults?: number;
    name?: string;
    openedFrom?: string;
    openedTo?: string;
  }) {
    const cnaeClasses = await this.cnaeResolver.resolve(
      params.queryType,
      params.queryValue,
    );

    return this.prospectCatalog.searchPage({
      queryValue: params.queryValue,
      city: params.city,
      uf: params.uf,
      neighborhood: params.address,
      cnaeCodes: this.cnaeResolver.cnaeFilterCodes(cnaeClasses),
      page: params.page,
      pageSize: params.pageSize,
      maxResults: params.maxResults,
      name: params.name,
      openedFrom: params.openedFrom,
      openedTo: params.openedTo,
    });
  }

  private normalizeCnpjDigits(value: string | null | undefined) {
    const digits = value?.replace(/\D/g, '') ?? '';
    return digits.length === 14 ? digits : null;
  }

  private candidatePlaceIds(candidate: CatalogCandidate) {
    const ids = new Set<string>();
    if (candidate.placeId?.trim()) {
      ids.add(candidate.placeId.trim());
    }
    const cnpj = this.normalizeCnpjDigits(candidate.cnpj);
    if (cnpj) {
      ids.add(`cnpj:${cnpj}`);
    }
    return [...ids];
  }

  private preferLead(
    current: LeadWithLatestCall | undefined,
    candidate: LeadWithLatestCall,
  ) {
    if (!current) return candidate;
    if (candidate.kanbanTracked && !current.kanbanTracked) return candidate;
    if (current.kanbanTracked && !candidate.kanbanTracked) return current;
    const currentCalls = current.calls?.length ?? 0;
    const candidateCalls = candidate.calls?.length ?? 0;
    if (candidateCalls > currentCalls) return candidate;
    return current;
  }

  private async hydrateCandidates(
    tenantId: string,
    sessionId: string,
    candidates: CatalogCandidate[],
  ) {
    const placeIdKeys = new Set<string>();
    const cnpjDigits = new Set<string>();
    for (const candidate of candidates) {
      for (const placeId of this.candidatePlaceIds(candidate)) {
        placeIdKeys.add(placeId);
      }
      const cnpj = this.normalizeCnpjDigits(candidate.cnpj);
      if (cnpj) {
        cnpjDigits.add(cnpj);
      }
    }

    const orFilters: Prisma.LeadWhereInput[] = [];
    if (placeIdKeys.size > 0) {
      orFilters.push({ placeId: { in: [...placeIdKeys] } });
    }
    if (cnpjDigits.size > 0) {
      orFilters.push({ cnpj: { in: [...cnpjDigits] } });
    }

    if (orFilters.length === 0) {
      return candidates.map((candidate) =>
        this.toPreviewLeadResponse(tenantId, sessionId, candidate),
      );
    }

    const existing = await this.prisma.lead.findMany({
      where: {
        companyId: tenantId,
        deletedAt: null,
        OR: orFilters,
      },
      include: latestCallInclude,
    });

    const byPlaceId = new Map<string, LeadWithLatestCall>();
    const byCnpj = new Map<string, LeadWithLatestCall>();
    for (const lead of existing) {
      if (lead.placeId) {
        byPlaceId.set(
          lead.placeId,
          this.preferLead(byPlaceId.get(lead.placeId), lead),
        );
      }
      const cnpj = this.normalizeCnpjDigits(lead.cnpj ?? extractCnpjFromLead(lead));
      if (cnpj) {
        byCnpj.set(cnpj, this.preferLead(byCnpj.get(cnpj), lead));
      }
    }

    return candidates.map((candidate) => {
      let persisted: LeadWithLatestCall | undefined;
      for (const placeId of this.candidatePlaceIds(candidate)) {
        const found = byPlaceId.get(placeId);
        if (found) {
          persisted = found;
          break;
        }
      }
      if (!persisted) {
        const cnpj = this.normalizeCnpjDigits(candidate.cnpj);
        if (cnpj) {
          persisted = byCnpj.get(cnpj);
        }
      }

      if (persisted) {
        return this.toLeadResponse(persisted);
      }

      const cnpj = this.normalizeCnpjDigits(candidate.cnpj);
      const sibling = cnpj ? byCnpj.get(cnpj) : undefined;
      const preview = this.toPreviewLeadResponse(tenantId, sessionId, candidate);
      if (sibling) {
        return { ...preview, lastCall: mapLeadLastCall(sibling) };
      }
      return preview;
    });
  }

  private candidateScore(candidate: DiscoveredCompanyCandidate) {
    return 'aiScore' in candidate && typeof candidate.aiScore === 'number'
      ? candidate.aiScore
      : undefined;
  }

  private candidateNotes(candidate: DiscoveredCompanyCandidate) {
    return 'aiNotes' in candidate && typeof candidate.aiNotes === 'string'
      ? candidate.aiNotes
      : undefined;
  }

  private toPreviewLeadResponse(
    tenantId: string,
    sessionId: string,
    candidate: CatalogCandidate,
  ) {
    const now = new Date().toISOString();
    const placeId =
      candidate.placeId ??
      (candidate.cnpj ? `cnpj:${candidate.cnpj}` : undefined);
    return {
      id: candidate.cnpj
        ? catalogPreviewId(candidate.cnpj)
        : `external:${sessionId}:${candidate.name}`,
      companyId: tenantId,
      tenantId,
      searchSessionId: sessionId,
      organizationId: null,
      name: candidate.name,
      cnpj: candidate.cnpj ?? null,
      contactName: null,
      phone: candidate.phone ?? null,
      email: candidate.email ?? null,
      website: candidate.website ?? null,
      instagram: candidate.instagram ?? null,
      address: candidate.address ?? null,
      city: candidate.city ?? null,
      neighborhood: candidate.neighborhood ?? null,
      category: candidate.category ?? null,
      placeId: placeId ?? null,
      rating: candidate.rating ?? null,
      reviewsCount: candidate.reviewsCount ?? null,
      latitude: candidate.latitude ?? null,
      longitude: candidate.longitude ?? null,
      status: 'PRE_VENDA' as const,
      stageId: null,
      crmStatus: 'ACTIVE' as const,
      isMinimized: false,
      kanbanTracked: false,
      kanbanOrder: 0,
      aiScore: this.candidateScore(candidate) ?? null,
      aiNotes: this.candidateNotes(candidate) ?? null,
      source: candidate.source,
      rawData: materializeRegistrySnapshotFromRawData(
        candidate.rawData,
        placeId,
      ),
      createdAt: now,
      updatedAt: now,
    };
  }

  private toSessionResponse(
    session: {
      id: string;
      tenantId: string;
      queryType: LeadSearchQueryType;
      queryValue: string;
      city: string;
      uf: string;
      createdAt: Date;
    },
    leadsCount: number,
  ) {
    return {
      id: session.id,
      tenantId: session.tenantId,
      queryType: session.queryType,
      queryValue: session.queryValue,
      city: session.city,
      uf: session.uf,
      createdAt: session.createdAt.toISOString(),
      leadsCount,
    };
  }

  private toLeadResponse(lead: LeadWithLatestCall) {
    return {
      id: lead.id,
      companyId: lead.companyId,
      tenantId: lead.companyId,
      searchSessionId: lead.searchSessionId,
      organizationId: lead.organizationId,
      name: lead.name,
      cnpj: lead.cnpj ?? extractCnpjFromLead(lead),
      contactName: lead.contactName,
      phone: lead.phone,
      email: lead.email,
      website: lead.website,
      instagram: lead.instagram,
      address: lead.address,
      city: lead.city,
      neighborhood: lead.neighborhood,
      category: lead.category,
      placeId: lead.placeId,
      rating: lead.rating,
      reviewsCount: lead.reviewsCount,
      latitude: lead.latitude,
      longitude: lead.longitude,
      status: lead.status,
      stageId: lead.stageId,
      crmStatus: lead.crmStatus,
      isMinimized: lead.isMinimized,
      kanbanTracked: lead.kanbanTracked,
      kanbanOrder: lead.kanbanOrder,
      orcamento: lead.orcamento == null ? null : Number(lead.orcamento),
      aiScore: lead.aiScore,
      aiNotes: lead.aiNotes,
      source: lead.source,
      rawData: lead.rawData,
      lastCall: mapLeadLastCall(lead),
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    };
  }
}
