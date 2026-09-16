import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Lead, LeadSearchQueryType, Prisma } from '@prisma/client';
import { DEFAULT_COMPANY_ID } from '../../../company/company.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import type { DiscoveredCompanyCandidate } from '../domain/company-lookup.types';
import { LeadMinerClient } from '../infrastructure/lead-miner.client';
import { mapLeadMinerRecordsToCandidates } from '../infrastructure/lead-miner.mapper';
import { CnaeResolverService } from './cnae-resolver.service';
import { CompanyDiscoveryService } from './company-discovery.service';
import type { B2bLeadSearchDto } from '../dto/b2b-lead-search.dto';

const DEFAULT_MAX_RESULTS = 20;

@Injectable()
export class LeadSearchSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyDiscovery: CompanyDiscoveryService,
    private readonly leadMinerClient: LeadMinerClient,
    private readonly cnaeResolver: CnaeResolverService,
  ) {}

  async search(tenantId: string | null | undefined, dto: B2bLeadSearchDto) {
    const resolvedTenantId = tenantId?.trim() || DEFAULT_COMPANY_ID;
    const queryType = dto.queryType as LeadSearchQueryType;
    const city = dto.city.trim();
    const uf = dto.uf.trim().toUpperCase();
    const queryValue = dto.queryValue.trim();

    if (!city || !uf || !queryValue) {
      throw new BadRequestException('queryValue, city and uf are required');
    }

    const discovered = await this.discoverCandidates(dto, {
      queryType,
      queryValue,
      city,
      uf,
      maxResults: dto.maxResults,
      address: dto.address?.trim(),
    });

    const candidates = discovered;

    const session = await this.prisma.leadSearchSession.create({
      data: {
        tenantId: resolvedTenantId,
        queryType,
        queryValue,
        city,
        uf,
      },
    });

    const leads: Lead[] = [];

    for (const candidate of candidates) {
      const existing = await this.findExistingLead(resolvedTenantId, candidate);

      if (existing) {
        const updated = await this.prisma.lead.update({
          where: { id: existing.id },
          data: this.buildLeadUpdateFromCandidate(
            existing,
            candidate,
            session.id,
          ),
        });
        leads.push(updated);
        continue;
      }

      const lead = await this.prisma.lead.create({
        data: {
          companyId: resolvedTenantId,
          name: candidate.name,
          phone: candidate.phone,
          email: candidate.email,
          website: candidate.website,
          instagram: candidate.instagram,
          address: candidate.address,
          city: candidate.city ?? city,
          neighborhood: candidate.neighborhood,
          category: candidate.category,
          latitude: candidate.latitude,
          longitude: candidate.longitude,
          rating: candidate.rating,
          reviewsCount: candidate.reviewsCount,
          source: candidate.source,
          rawData: candidate.rawData as Prisma.InputJsonValue,
          searchSessionId: session.id,
          placeId:
            candidate.placeId ??
            (candidate.cnpj ? `cnpj:${candidate.cnpj}` : undefined),
        },
      });
      leads.push(lead);
    }

    return {
      session: this.toSessionResponse(session, leads.length),
      leads: leads.map((lead) => this.toLeadResponse(lead)),
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

    const leads = await this.prisma.lead.findMany({
      where: {
        searchSessionId: session.id,
        companyId: resolvedTenantId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      session: this.toSessionResponse(session, leads.length),
      leads: leads.map((lead) => this.toLeadResponse(lead)),
    };
  }

  private async discoverCandidates(
    dto: B2bLeadSearchDto,
    params: {
      queryType: LeadSearchQueryType;
      queryValue: string;
      city: string;
      uf: string;
      maxResults?: number;
      address?: string;
    },
  ): Promise<DiscoveredCompanyCandidate[]> {
    const maxResults = params.maxResults ?? DEFAULT_MAX_RESULTS;

    if (params.queryType === 'NICHO') {
      return this.discoverViaLeadMiner(params);
    }

    const cnaeClasses = await this.cnaeResolver.resolve(
      'CNAE',
      params.queryValue,
    );
    const leadMinerCategory =
      cnaeClasses[0]?.description?.trim() || params.queryValue;

    const [leadMinerCandidates, registryCandidates] = await Promise.all([
      this.discoverViaLeadMiner({
        ...params,
        queryValue: leadMinerCategory,
      }),
      this.companyDiscovery.discover({
        queryType: dto.queryType,
        queryValue: params.queryValue,
        city: params.city,
        uf: params.uf,
        maxResults,
      }),
    ]);

    return this.mergeDiscoveredCandidates(
      leadMinerCandidates,
      registryCandidates,
      maxResults,
    );
  }

  private async discoverViaLeadMiner(params: {
    queryValue: string;
    city: string;
    maxResults?: number;
    address?: string;
  }): Promise<DiscoveredCompanyCandidate[]> {
    const neighborhood = params.address?.trim() || params.city.trim();
    const maxResults = params.maxResults ?? 25;

    const records = await this.leadMinerClient.searchAndWait({
      category: params.queryValue,
      city: params.city,
      neighborhood,
      max_results: maxResults,
    });

    return mapLeadMinerRecordsToCandidates(records, {
      city: params.city,
      neighborhood,
      category: params.queryValue,
    }).slice(0, maxResults);
  }

  private mergeDiscoveredCandidates(
    leadMinerCandidates: DiscoveredCompanyCandidate[],
    registryCandidates: DiscoveredCompanyCandidate[],
    maxResults: number,
  ): DiscoveredCompanyCandidate[] {
    const merged = new Map<string, DiscoveredCompanyCandidate>();

    for (const candidate of leadMinerCandidates) {
      merged.set(this.buildCandidateKey(candidate), candidate);
    }

    for (const candidate of registryCandidates) {
      const directKey = this.buildCandidateKey(candidate);
      const existing = merged.get(directKey);

      if (existing) {
        merged.set(directKey, this.mergeCandidates(existing, candidate));
        continue;
      }

      const fuzzyMatch = Array.from(merged.values()).find((item) =>
        this.isSameBusiness(item, candidate),
      );

      if (fuzzyMatch) {
        const key = this.buildCandidateKey(fuzzyMatch);
        merged.set(key, this.mergeCandidates(fuzzyMatch, candidate));
        continue;
      }

      merged.set(directKey, candidate);
    }

    return Array.from(merged.values()).slice(0, maxResults);
  }

  private mergeCandidates(
    leadMinerCandidate: DiscoveredCompanyCandidate,
    registryCandidate: DiscoveredCompanyCandidate,
  ): DiscoveredCompanyCandidate {
    const contact = this.isContactRichSource(leadMinerCandidate.source)
      ? leadMinerCandidate
      : registryCandidate;
    const registry =
      contact === leadMinerCandidate ? registryCandidate : leadMinerCandidate;

    return {
      ...registry,
      ...contact,
      name: contact.name || registry.name,
      phone: contact.phone ?? registry.phone,
      website: contact.website ?? registry.website,
      email: contact.email ?? registry.email,
      instagram: contact.instagram ?? registry.instagram,
      cnpj: registry.cnpj ?? contact.cnpj,
      placeId: contact.placeId ?? registry.placeId,
      address: contact.address ?? registry.address,
      city: contact.city ?? registry.city,
      neighborhood: contact.neighborhood ?? registry.neighborhood,
      category: registry.category ?? contact.category,
      latitude: contact.latitude ?? registry.latitude,
      longitude: contact.longitude ?? registry.longitude,
      rating: contact.rating ?? registry.rating,
      reviewsCount: contact.reviewsCount ?? registry.reviewsCount,
      source:
        contact.source === registry.source
          ? contact.source
          : `${contact.source}+${registry.source}`,
      rawData: {
        leadMiner: contact.rawData,
        registry: registry.rawData,
      },
    };
  }

  private isContactRichSource(source: string): boolean {
    return (
      source === 'leadminer' ||
      source === 'apify' ||
      source === 'outscraper'
    );
  }

  private buildCandidateKey(candidate: DiscoveredCompanyCandidate): string {
    if (candidate.placeId) {
      return `place:${candidate.placeId}`;
    }

    if (candidate.cnpj) {
      return `cnpj:${candidate.cnpj}`;
    }

    return `name:${this.normalizeCandidateName(candidate.name)}:${this.normalizeCandidateName(candidate.city ?? '')}`;
  }

  private isSameBusiness(
    left: DiscoveredCompanyCandidate,
    right: DiscoveredCompanyCandidate,
  ): boolean {
    const leftName = this.normalizeCandidateName(left.name);
    const rightName = this.normalizeCandidateName(right.name);

    if (!leftName || !rightName) {
      return false;
    }

    if (leftName === rightName) {
      return true;
    }

    return leftName.includes(rightName) || rightName.includes(leftName);
  }

  private normalizeCandidateName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private async findExistingLead(
    tenantId: string,
    candidate: DiscoveredCompanyCandidate,
  ): Promise<Lead | null> {
    if (candidate.placeId) {
      const byPlaceId = await this.prisma.lead.findFirst({
        where: {
          placeId: candidate.placeId,
          companyId: tenantId,
          deletedAt: null,
        },
      });
      if (byPlaceId) {
        return byPlaceId;
      }
    }

    if (candidate.cnpj) {
      const byCnpj = await this.prisma.lead.findFirst({
        where: {
          placeId: `cnpj:${candidate.cnpj}`,
          companyId: tenantId,
          deletedAt: null,
        },
      });
      if (byCnpj) {
        return byCnpj;
      }
    }

    return null;
  }

  private buildLeadUpdateFromCandidate(
    existing: Lead,
    candidate: DiscoveredCompanyCandidate,
    searchSessionId: string,
  ) {
    return {
      searchSession: { connect: { id: searchSessionId } },
      phone: candidate.phone ?? existing.phone,
      website: candidate.website ?? existing.website,
      email: candidate.email ?? existing.email,
      instagram: candidate.instagram ?? existing.instagram,
      address: candidate.address ?? existing.address,
      city: candidate.city ?? existing.city,
      neighborhood: candidate.neighborhood ?? existing.neighborhood,
      category: candidate.category ?? existing.category,
      latitude: candidate.latitude ?? existing.latitude,
      longitude: candidate.longitude ?? existing.longitude,
      rating: candidate.rating ?? existing.rating,
      reviewsCount: candidate.reviewsCount ?? existing.reviewsCount,
      placeId:
        candidate.placeId ??
        (candidate.cnpj ? `cnpj:${candidate.cnpj}` : undefined) ??
        existing.placeId,
      rawData: candidate.rawData as Prisma.InputJsonValue,
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
