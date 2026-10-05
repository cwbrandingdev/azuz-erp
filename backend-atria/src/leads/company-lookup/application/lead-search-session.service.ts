import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Lead, LeadSearchQueryType } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../../company/company.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import type { DiscoveredCompanyCandidate } from '../domain/company-lookup.types';
import { CnaeResolverService } from './cnae-resolver.service';
import {
  CatalogCandidate,
  DEFAULT_CATALOG_MAX_RESULTS,
  ProspectCompanyCatalogService,
} from './prospect-company-catalog.service';
import type { B2bLeadSearchDto } from '../dto/b2b-lead-search.dto';
import { materializeRegistrySnapshotFromRawData } from '../../qualification/registry-signals.util';

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

    const discovered = await this.discoverCandidates({
      queryType,
      queryValue,
      city,
      uf,
      maxResults: dto.maxResults,
      address: dto.address?.trim(),
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
      discovered,
    );

    return {
      session: this.toSessionResponse(session, leads.length),
      leads,
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
  ) {
    const resolvedTenantId = tenantId?.trim() || DEFAULT_COMPANY_ID;

    const session = await this.prisma.leadSearchSession.findFirst({
      where: {
        id: sessionId,
        tenantId: resolvedTenantId,
      },
    });

    if (!session) {
      throw new NotFoundException('Search session not found');
    }

    const linked = await this.prisma.lead.findMany({
      where: {
        searchSessionId: session.id,
        companyId: resolvedTenantId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (linked.length > 0) {
      return {
        session: this.toSessionResponse(session, linked.length),
        leads: linked.map((lead) => this.toLeadResponse(lead)),
      };
    }

    const discovered = await this.discoverCandidates({
      queryType: session.queryType,
      queryValue: session.queryValue,
      city: session.city,
      uf: session.uf,
    });
    const leads = await this.hydrateCandidates(
      resolvedTenantId,
      session.id,
      discovered,
    );

    return {
      session: this.toSessionResponse(session, leads.length),
      leads,
    };
  }

  private async discoverCandidates(params: {
    queryType: LeadSearchQueryType;
    queryValue: string;
    city: string;
    uf: string;
    maxResults?: number;
    address?: string;
  }): Promise<CatalogCandidate[]> {
    const cnaeClasses = await this.cnaeResolver.resolve(
      params.queryType,
      params.queryValue,
    );

    return this.prospectCatalog.search({
      queryValue: params.queryValue,
      city: params.city,
      uf: params.uf,
      neighborhood: params.address,
      cnaeCodes: this.cnaeResolver.cnaeFilterCodes(cnaeClasses),
      maxResults: params.maxResults ?? DEFAULT_CATALOG_MAX_RESULTS,
    });
  }

  private async hydrateCandidates(
    tenantId: string,
    sessionId: string,
    candidates: CatalogCandidate[],
  ) {
    const placeIds = candidates
      .map((candidate) => candidate.placeId)
      .filter((placeId): placeId is string => Boolean(placeId));

    const existing =
      placeIds.length === 0
        ? []
        : await this.prisma.lead.findMany({
            where: {
              companyId: tenantId,
              deletedAt: null,
              placeId: { in: placeIds },
            },
          });

    const byPlaceId = new Map<string, Lead>();
    for (const lead of existing) {
      if (!lead.placeId) continue;
      const current = byPlaceId.get(lead.placeId);
      if (!current || (lead.kanbanTracked && !current.kanbanTracked)) {
        byPlaceId.set(lead.placeId, lead);
      }
    }

    return candidates.map((candidate) => {
      const persisted = candidate.placeId
        ? byPlaceId.get(candidate.placeId)
        : undefined;
      if (persisted) {
        return this.toLeadResponse(persisted);
      }
      return this.toPreviewLeadResponse(tenantId, sessionId, candidate);
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
      id: candidate.cnpj ? catalogPreviewId(candidate.cnpj) : `external:${sessionId}:${candidate.name}`,
      companyId: tenantId,
      tenantId,
      searchSessionId: sessionId,
      organizationId: null,
      name: candidate.name,
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

  private toLeadResponse(lead: Lead) {
    return {
      id: lead.id,
      companyId: lead.companyId,
      tenantId: lead.companyId,
      searchSessionId: lead.searchSessionId,
      organizationId: lead.organizationId,
      name: lead.name,
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
      aiScore: lead.aiScore,
      aiNotes: lead.aiNotes,
      source: lead.source,
      rawData: lead.rawData,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    };
  }
}
