import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CrmLeadStatus,
  CrmReminderTaskStatus,
  Lead,
  LeadSearchQueryType,
  LeadStatus,
  Prisma,
  RoleName,
} from '@prisma/client';
import { normalizeRoleName } from '../auth/constants/permissions';
import { AiService } from '../ai/ai.service';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { addBusinessDays } from './business-days';
import { CrmScopeService } from './crm-scope.service';
import { LeadNotificationService } from './lead-notification.service';
import { CreateCrmLeadDto } from '../crm/dto/create-crm-lead.dto';
import { UpdateCrmLeadDto } from '../crm/dto/update-crm-lead.dto';
import {
  buildApifyActorInput,
  mapApifyPlaces,
} from './maps-scraper/apify-place.mapper';
import { FetchMapsLeadsDto } from './dto/fetch-maps-leads.dto';
import { AddLeadToKanbanDto, UpdateLeadStatusDto } from './dto/lead-kanban.dto';
import { LeadSearchDto } from './dto/lead-search.dto';
import { LeadStagesService } from './lead-stages.service';
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from './lead-kanban.constants';
import { assertLeadStatusMoveAllowed } from './lead-pipeline-zones';
import { LeadQualificationService } from './qualification/lead-qualification.service';
import { MapsScraperService } from './maps-scraper/maps-scraper.service';
import {
  contactGapsFromPlace,
  instagramUrlFromValue,
  leadNeedsMapsContactEnrichment,
  mergeMapsEnrichmentIntoRawData,
  mostCommonNeighborhood,
  readCachedMapsEnrichment,
} from './maps-scraper/maps-contact-merge.util';
import { matchPlacesToCompanies } from './maps-scraper/company-place-match.util';
import { readLegalNameFromRawData } from './qualification/registry-signals.util';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import {
  CATALOG_PREVIEW_ID_PREFIX,
  isCatalogPreviewId,
  LeadSearchSessionService,
} from './company-lookup/application/lead-search-session.service';

const DEFAULT_SCRAPER_URL = 'https://leadminer-one.vercel.app/api/scraper';
const SCRAPER_TIMEOUT_MS = 120_000;
const OUTSCRAPER_TIMEOUT_MS = 180_000;
const OUTSCRAPER_LIMIT = 25;
const APIFY_TIMEOUT_MS = 180_000;
const APIFY_DEFAULT_MAX_RESULTS = 25;
const APIFY_MAX_RESULTS_LIMIT = 120;

interface OutscraperPlace {
  name?: string;
  phone?: string;
  email?: string;
  site?: string;
  full_address?: string;
  address?: string;
  city?: string;
  borough?: string;
  neighborhood?: string;
  category?: string;
  type?: string;
  place_id?: string;
  rating?: number;
  reviews?: number;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}

interface MappedPlace {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  category?: string;
  placeId?: string;
  rating?: number;
  reviewsCount?: number;
  latitude?: number;
  longitude?: number;
  source: string;
  rawData: Prisma.InputJsonValue;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly companySettings: CompanySettingsService,
    private readonly leadStages: LeadStagesService,
    private readonly crmScope: CrmScopeService,
    private readonly leadNotifications: LeadNotificationService,
    private readonly leadQualification: LeadQualificationService,
    private readonly mapsScraper: MapsScraperService,
    private readonly leadSearchSessions: LeadSearchSessionService,
  ) {}

  async preQualify(user: AuthenticatedUser, id: string) {
    const lead = await this.resolveLeadForUser(user, id);
    const apifyToken = await this.resolveApifyToken();

    const result = await this.leadQualification.qualifyLead(lead, apifyToken);

    const websiteInstagram = instagramUrlFromValue(lead.website);
    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        aiScore: result.score,
        aiNotes: result.notes,
        rawData: result.mergedRawData,
        ...result.contactUpdates,
        ...(!lead.instagram?.trim() && websiteInstagram
          ? { instagram: websiteInstagram }
          : {}),
      },
    });

    return this.toLeadResponse(updated);
  }

  async enrichSearchSessionFromMaps(
    user: AuthenticatedUser,
    sessionId: string,
  ) {
    const { session, leads } = await this.leadSearchSessions.getSessionLeads(
      user.companyId,
      sessionId,
    );

    const targets = leads.filter(
      (lead) =>
        leadNeedsMapsContactEnrichment(lead) &&
        !readCachedMapsEnrichment(lead.rawData),
    );

    if (targets.length === 0) {
      return {
        session,
        leads,
        matched: 0,
        updated: 0,
      };
    }

    const neighborhood = mostCommonNeighborhood(
      leads.map((lead) => lead.neighborhood),
      session.city,
    );

    const places = await this.mapsScraper.fetchPlacesForCatalogEnrichment(
      {
        city: session.city,
        category: session.queryValue,
        neighborhood,
      },
      Math.min(50, Math.max(targets.length, 15)),
    );

    const matches = matchPlacesToCompanies(targets, places, (lead) => [
      readLegalNameFromRawData(lead.rawData),
    ]);

    const fetchedAt = new Date().toISOString();
    const updatedIds = new Set<string>();
    const byId = new Map(leads.map((lead) => [lead.id, { ...lead }]));

    for (const match of matches) {
      const current = byId.get(match.company.id);
      if (!current) continue;

      const updates = contactGapsFromPlace(match.company, match.place);
      const websiteInstagram = instagramUrlFromValue(
        updates.website ?? match.company.website,
      );
      if (
        !updates.instagram &&
        !match.company.instagram?.trim() &&
        websiteInstagram
      ) {
        updates.instagram = websiteInstagram;
      }

      const nextRawData = mergeMapsEnrichmentIntoRawData(current.rawData, {
        fetchedAt,
        provider: 'apify',
        matchedName: match.place.name,
        placeId: match.place.placeId,
        instagram: updates.instagram ?? match.place.instagram,
        website: updates.website ?? match.place.website,
        rating: updates.rating ?? match.place.rating,
        reviewsCount: updates.reviewsCount ?? match.place.reviewsCount,
      });

      if (!isCatalogPreviewId(current.id)) {
        await this.prisma.lead.update({
          where: { id: current.id },
          data: {
            ...updates,
            rawData: nextRawData as Prisma.InputJsonValue,
          },
        });
      }

      byId.set(current.id, {
        ...current,
        ...updates,
        instagram: updates.instagram ?? current.instagram,
        website: updates.website ?? current.website,
        phone: updates.phone ?? current.phone,
        rating: updates.rating ?? current.rating,
        reviewsCount: updates.reviewsCount ?? current.reviewsCount,
        address: updates.address ?? current.address,
        neighborhood: updates.neighborhood ?? current.neighborhood,
        latitude: updates.latitude ?? current.latitude,
        longitude: updates.longitude ?? current.longitude,
        rawData: nextRawData as typeof current.rawData,
      } as typeof current);
      updatedIds.add(current.id);
    }

    return {
      session: { ...session, leadsCount: leads.length },
      leads: leads.map((lead) => byId.get(lead.id) ?? lead),
      matched: matches.length,
      updated: updatedIds.size,
    };
  }

  private async resolveApifyToken(): Promise<string | null> {
    const envToken = this.configService.get<string>('APIFY_API_TOKEN')?.trim();
    if (envToken) {
      return envToken;
    }

    try {
      const credentials =
        await this.companySettings.getIntegrationCredentialsForCurrentTenant();
      return credentials.apifyApiToken?.trim() || null;
    } catch {
      return null;
    }
  }

  async search(dto: LeadSearchDto): Promise<unknown> {
    const scraperUrl =
      this.configService.get<string>('LEAD_SCRAPER_URL') ?? DEFAULT_SCRAPER_URL;

    const payload = {
      bairro: dto.bairro,
      categoria: dto.categoria,
      cidade: dto.cidade,
      termoBusca: dto.categoria,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SCRAPER_TIMEOUT_MS);

    try {
      const response = await fetch(scraperUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const bodyText = await response.text();
      let body: unknown;

      try {
        body = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        body = bodyText;
      }

      if (!response.ok) {
        this.logger.warn(
          `Lead scraper error ${response.status}: ${bodyText.slice(0, 500)}`,
        );
        return this.searchLocalLeads(dto);
      }

      return body;
    } catch (error) {
      this.logger.warn(`Lead scraper request failed: ${String(error)}`);
      return this.searchLocalLeads(dto);
    } finally {
      clearTimeout(timeout);
    }
  }

  async fetchMaps(
    dto: FetchMapsLeadsDto,
  ): Promise<ReturnType<LeadsService['toLeadResponse']>[]> {
    const places = await this.fetchPlacesFromExternalApi(dto);
    if (places.length === 0) {
      return [];
    }

    const created: Lead[] = [];

    for (const place of places) {
      if (place.placeId) {
        const existing = await this.prisma.lead.findFirst({
          where: { placeId: place.placeId, deletedAt: null },
        });
        if (existing) {
          created.push(existing);
          continue;
        }
      }

      const lead = await this.prisma.lead.create({
        data: {
          name: place.name,
          phone: place.phone,
          email: place.email,
          website: place.website,
          instagram: place.instagram,
          address: place.address,
          city: place.city ?? dto.city,
          neighborhood: place.neighborhood ?? dto.neighborhood,
          category: place.category ?? dto.category,
          placeId: place.placeId,
          rating: place.rating,
          reviewsCount: place.reviewsCount,
          latitude: place.latitude,
          longitude: place.longitude,
          source: place.source,
          rawData: place.rawData,
        },
      });
      created.push(lead);
    }

    return created.map((lead) => this.toLeadResponse(lead));
  }

  async findAll(
    user?: AuthenticatedUser,
  ): Promise<ReturnType<LeadsService['toLeadResponse']>[]> {
    const orgFilter = user
      ? await this.crmScope.buildLeadOrganizationFilter(user)
      : {};

    const leads = await this.prisma.lead.findMany({
      where: { deletedAt: null, ...orgFilter },
      orderBy: { createdAt: 'desc' },
    });

    return leads.map((lead) => this.toLeadResponse(lead));
  }

  async findAllForCrm(
    user: AuthenticatedUser,
  ): Promise<ReturnType<LeadsService['toCrmLeadResponse']>[]> {
    const where: Prisma.LeadWhereInput = {
      deletedAt: null,
      ...(await this.crmScope.buildLeadOrganizationFilter(user)),
    };

    const leads = await this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return leads.map((lead) => this.toCrmLeadResponse(lead));
  }

  async findProspectingLeads(
    user: AuthenticatedUser,
    organizationId?: string,
  ): Promise<ReturnType<LeadsService['toCrmLeadResponse']>[]> {
    const where: Prisma.LeadWhereInput = {
      deletedAt: null,
      ...(await this.crmScope.buildProspectingLeadOrganizationFilter(
        user,
        organizationId,
      )),
    };

    const leads = await this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return leads.map((lead) => this.toCrmLeadResponse(lead));
  }

  async toggleLeadCollapse(
    user: AuthenticatedUser,
    id: string,
    isMinimized?: boolean,
  ) {
    const lead = await this.findLeadForUser(user, id);
    const nextMinimized = isMinimized ?? !lead.isMinimized;

    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: { isMinimized: nextMinimized },
    });

    return this.toCrmLeadResponse(updated);
  }

  async findKanbanBoard(
    user: AuthenticatedUser,
    organizationId?: string,
  ) {
    const stageOrganizationId = this.resolveKanbanOrganizationId(
      user,
      organizationId,
    );
    const stages = await this.leadStages.ensureDefaults(stageOrganizationId);
    const orgFilter = await this.crmScope.buildKanbanLeadOrganizationFilter(
      user,
      organizationId,
    );

    const leads = await this.prisma.lead.findMany({
      where: { kanbanTracked: true, deletedAt: null, ...orgFilter },
      orderBy: [
        { status: 'asc' },
        { kanbanOrder: 'asc' },
        { updatedAt: 'desc' },
      ],
    });

    const columns = stages.map((stage) => {
      const pipelineStatus = this.leadStages.statusFromStage(stage);
      return {
        id: stage.id,
        stageId: stage.id,
        status: stage.key ?? pipelineStatus,
        title: stage.name,
        color: stage.color,
        order: stage.order,
        leads: leads
          .filter((lead) => this.leadMatchesStage(lead, stage, stages))
          .map((lead) => this.toLeadResponse(lead)),
      };
    });

    return {
      columns,
      total: leads.length,
      crmMoveZone: this.crmScope.getMoveZone(user.role),
    };
  }

  async createForCrm(user: AuthenticatedUser, dto: CreateCrmLeadDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const organizationId = await this.resolveOrganizationIdForCreate(
      user,
      dto.organizationId,
    );
    const stage = await this.leadStages.resolveStage({
      stageId: dto.stageId,
      organizationId,
    });
    const status = this.leadStages.statusFromStage(stage);

    const lead = await this.prisma.lead.create({
      data: {
        name,
        contactName: dto.contactName?.trim() || null,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        address: dto.address,
        city: dto.city,
        neighborhood: dto.neighborhood,
        category: dto.category,
        placeId: dto.placeId,
        source: dto.source ?? 'manual',
        organizationId,
        status,
        stageId: stage.id,
        crmStatus: this.deriveCrmStatusFromPipeline(status),
        kanbanTracked: true,
        kanbanOrder: await this.nextKanbanOrderAtTop(status),
      },
    });

    await this.createFollowUpReminder(lead);
    this.notifyOrganizationRepresentatives(lead, user.userId);
    return this.toCrmLeadResponse(lead);
  }

  async updateForCrm(user: AuthenticatedUser, id: string, dto: UpdateCrmLeadDto) {
    const lead = await this.findLeadForUser(user, id);

    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Informe o nome da empresa ou contato.');
    }

    const emptyToNull = (value: string | undefined) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        ...(name ? { name } : {}),
        ...(dto.contactName !== undefined
          ? { contactName: emptyToNull(dto.contactName) }
          : {}),
        ...(dto.phone !== undefined ? { phone: emptyToNull(dto.phone) } : {}),
        ...(dto.email !== undefined ? { email: emptyToNull(dto.email) } : {}),
        ...(dto.website !== undefined
          ? { website: emptyToNull(dto.website) }
          : {}),
        ...(dto.instagram !== undefined
          ? { instagram: emptyToNull(dto.instagram) }
          : {}),
        ...(dto.address !== undefined
          ? { address: emptyToNull(dto.address) }
          : {}),
        ...(dto.city !== undefined ? { city: emptyToNull(dto.city) } : {}),
        ...(dto.neighborhood !== undefined
          ? { neighborhood: emptyToNull(dto.neighborhood) }
          : {}),
        ...(dto.category !== undefined
          ? { category: emptyToNull(dto.category) }
          : {}),
        ...(dto.source !== undefined
          ? { source: emptyToNull(dto.source) ?? 'manual' }
          : {}),
      },
    });

    return this.toLeadResponse(updated);
  }

  async findReminderBoard(user: AuthenticatedUser) {
    const orgFilter = await this.crmScope.buildLeadOrganizationFilter(user);

    const tasks = await this.prisma.crmReminderTask.findMany({
      where: {
        lead: {
          deletedAt: null,
          ...orgFilter,
        },
      },
      include: {
        lead: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    const columns = [
      { status: 'PENDING', title: 'A fazer' },
      { status: 'DONE', title: 'Concluído' },
      { status: 'CANCELLED', title: 'Cancelado' },
    ] as const;

    return {
      columns: columns.map((column) => ({
        ...column,
        tasks: tasks
          .filter((task) => task.status === column.status)
          .map((task) => this.toReminderResponse(task)),
      })),
      total: tasks.length,
    };
  }

  async updateReminderStatus(id: string, status: CrmReminderTaskStatus) {
    const existing = await this.prisma.crmReminderTask.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Lembrete não encontrado.');
    }

    const updated = await this.prisma.crmReminderTask.update({
      where: { id },
      data: {
        status,
        completedAt: status === CrmReminderTaskStatus.DONE ? new Date() : null,
      },
      include: {
        lead: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    return this.toReminderResponse(updated);
  }

  async addToKanban(user: AuthenticatedUser, dto: AddLeadToKanbanDto) {
    let lead: Lead | null = null;

    if (dto.leadId) {
      lead = await this.findLeadForUser(user, dto.leadId);
    } else if (dto.placeId) {
      const orgFilter = await this.crmScope.buildLeadOrganizationFilter(user);
      lead = await this.prisma.lead.findFirst({
        where: { placeId: dto.placeId, deletedAt: null, ...orgFilter },
      });
    }

    if (!lead) {
      const name = dto.name?.trim();
      if (!name) {
        throw new BadRequestException(
          'Informe leadId ou os dados do lead (name) para adicionar ao kanban.',
        );
      }

      const organizationId = await this.resolveOrganizationIdForCreate(
        user,
        dto.organizationId,
      );

      const stage = await this.leadStages.resolveStage({
        organizationId,
        stageId: dto.stageId,
      });
      const status = this.leadStages.statusFromStage(stage);

      lead = await this.prisma.lead.create({
        data: {
          name,
          contactName: dto.contactName?.trim() || null,
          phone: dto.phone,
          email: dto.email,
          website: dto.website,
          address: dto.address,
          city: dto.city,
          neighborhood: dto.neighborhood,
          category: dto.category,
          placeId: dto.placeId,
          source: dto.source ?? 'manual',
          organizationId,
          status,
          stageId: stage.id,
          kanbanTracked: true,
          kanbanOrder: await this.nextKanbanOrderAtTop(status),
        },
      });

      await this.createFollowUpReminder(lead);
      this.notifyOrganizationRepresentatives(lead, user.userId);
      return this.toLeadResponse(lead);
    }

    await this.crmScope.assertLeadAccess(user, lead);

    if (lead.kanbanTracked) {
      return this.toLeadResponse(lead);
    }

    const organizationId = dto.organizationId?.trim() || lead.organizationId;
    const stage = await this.leadStages.resolveStage({
      organizationId,
      stageId: dto.stageId,
    });

    if (organizationId) {
      await this.crmScope.assertUserCanManageOrganization(user, organizationId);
    }

    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        kanbanTracked: true,
        status: this.leadStages.statusFromStage(stage),
        stageId: stage.id,
        kanbanOrder: await this.nextKanbanOrderAtTop(
          this.leadStages.statusFromStage(stage),
        ),
        ...(organizationId ? { organizationId } : {}),
        ...(dto.contactName !== undefined
          ? { contactName: dto.contactName.trim() || null }
          : {}),
      },
    });

    return this.toLeadResponse(updated);
  }

  async removeFromKanban(user: AuthenticatedUser, id: string) {
    const lead = await this.findLeadForUser(user, id);

    if (!lead.kanbanTracked) {
      return { success: true };
    }

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { kanbanTracked: false },
    });

    return { success: true };
  }

  async updateLeadStage(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateLeadStatusDto,
  ) {
    return this.updateStatus(user, id, dto);
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateLeadStatusDto,
  ) {
    const lead = await this.findLeadForUser(user, id);
    if (!dto.status && !dto.stageId) {
      throw new BadRequestException('Informe status ou stageId.');
    }

    const stage = await this.leadStages.resolveStage({
      stageId: dto.stageId,
      status: dto.status,
      organizationId: lead.organizationId,
    });
    const status = this.leadStages.statusFromStage(stage);

    try {
      assertLeadStatusMoveAllowed(user.role, lead.status, status);
    } catch (error) {
      throw new ForbiddenException(
        error instanceof Error ? error.message : 'Movimento não permitido.',
      );
    }

    const targetOrder =
      dto.order ?? (await this.nextKanbanOrderAtTop(status, id));

    const crmStatus = this.deriveCrmStatusFromPipeline(status);
    const autoMinimize = this.shouldAutoMinimize(crmStatus);

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        status,
        stageId: stage.id,
        crmStatus,
        ...(autoMinimize ? { isMinimized: true } : {}),
        kanbanTracked: true,
        kanbanOrder: targetOrder,
      },
    });

    return this.toLeadResponse(updated);
  }

  async qualify(user: AuthenticatedUser, id: string) {
    const lead = await this.resolveLeadForUser(user, id);

    if (this.crmScope.getMoveZone(user.role) !== 'sdr') {
      throw new ForbiddenException(
        'Apenas usuários SDR podem qualificar leads.',
      );
    }

    const result = await this.aiService.qualifyLead({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      website: lead.website,
      address: lead.address,
      city: lead.city,
      neighborhood: lead.neighborhood,
      category: lead.category,
      rating: lead.rating,
      reviewsCount: lead.reviewsCount,
    });

    const pipelineStatus = result.qualified
      ? LeadStatus.VENDA_FINALIZADA
      : LeadStatus.NAO_TEM_INTERESSE;
    const crmStatus = this.deriveCrmStatusFromPipeline(pipelineStatus);
    const stage = await this.leadStages.resolveStage({
      status: pipelineStatus,
      organizationId: lead.organizationId,
    });

    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: pipelineStatus,
        stageId: stage.id,
        crmStatus,
        isMinimized: this.shouldAutoMinimize(crmStatus),
        aiScore: result.score,
        aiNotes: result.notes,
        kanbanTracked: true,
      },
    });

    return this.toLeadResponse(updated);
  }

  async getComments(user: AuthenticatedUser, leadId: string) {
    await this.findLeadForUser(user, leadId);

    const comments = await this.prisma.leadComment.findMany({
      where: { leadId },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: comment.user,
    }));
  }

  async createComment(
    user: AuthenticatedUser,
    userId: string,
    leadId: string,
    content: string,
  ) {
    await this.findLeadForUser(user, leadId);

    const comment = await this.prisma.leadComment.create({
      data: {
        leadId,
        userId,
        content: content.trim(),
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, email: true },
        },
      },
    });

    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: comment.user,
    };
  }

  private async resolveLeadForUser(user: AuthenticatedUser, id: string) {
    if (isCatalogPreviewId(id)) {
      return this.materializeCatalogLead(
        user,
        id.slice(CATALOG_PREVIEW_ID_PREFIX.length),
      );
    }
    return this.findLeadForUser(user, id);
  }

  private async materializeCatalogLead(
    user: AuthenticatedUser,
    cnpjRaw: string,
  ) {
    const cnpj = cnpjRaw.replace(/\D/g, '');
    if (cnpj.length !== 14) {
      throw new BadRequestException('CNPJ inválido.');
    }

    const tenantId = user.companyId?.trim() || DEFAULT_COMPANY_ID;
    const placeId = `cnpj:${cnpj}`;
    const existing = await this.prisma.lead.findFirst({
      where: {
        companyId: tenantId,
        placeId,
        deletedAt: null,
      },
    });
    if (existing) {
      await this.crmScope.assertLeadAccess(user, existing);
      return existing;
    }

    const row = await this.prisma.prospectCompany.findUnique({
      where: { cnpj },
    });
    if (!row) {
      throw new NotFoundException('Empresa não encontrada no catálogo.');
    }

    const name = row.tradeName?.trim() || row.legalName;
    return this.prisma.lead.create({
      data: {
        companyId: tenantId,
        name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        city: row.city,
        neighborhood: row.neighborhood,
        category: row.primaryCnaeDescription,
        placeId,
        source: row.source,
        aiScore: row.blendedScore,
        aiNotes: row.notes,
        kanbanTracked: false,
      },
    });
  }

  private async nextKanbanOrderAtTop(
    status: LeadStatus,
    excludeId?: string,
  ) {
    const minOrder = await this.prisma.lead.aggregate({
      where: {
        kanbanTracked: true,
        status,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      _min: { kanbanOrder: true },
    });
    return (minOrder._min.kanbanOrder ?? 0) - 1;
  }

  private async findLeadForUser(user: AuthenticatedUser, id: string) {
    const orgFilter = await this.crmScope.buildLeadOrganizationFilter(user);
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null, ...orgFilter },
    });
    if (!lead) {
      throw new NotFoundException('Lead não encontrado.');
    }
    return lead;
  }

  private async resolveOrganizationIdForCreate(
    user: AuthenticatedUser,
    requestedOrganizationId?: string | null,
  ): Promise<string> {
    const organizationId = requestedOrganizationId?.trim();
    if (!organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    await this.crmScope.assertUserCanManageOrganization(user, organizationId);
    return organizationId;
  }

  private async ensureLeadExists(id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
    });
    if (!lead) {
      throw new NotFoundException('Lead não encontrado.');
    }
    return lead;
  }

  private resolveKanbanOrganizationId(
    user: AuthenticatedUser,
    organizationId?: string,
  ): string | null {
    const requested = organizationId?.trim();
    if (requested) return requested;

    const roleName = normalizeRoleName(user.role);
    if (
      roleName === RoleName.CLIENT ||
      roleName === RoleName.EXTERNAL_CLIENT_CRM
    ) {
      return user.clientId;
    }

    return null;
  }

  private leadMatchesStage(
    lead: { stageId: string | null; status: LeadStatus },
    stage: { id: string; key: string | null },
    stages: Array<{ id: string }>,
  ): boolean {
    if (lead.stageId) {
      const known = stages.some((item) => item.id === lead.stageId);
      if (known) return lead.stageId === stage.id;
    }
    return Boolean(stage.key) && lead.status === stage.key;
  }

  private notifyOrganizationRepresentatives(lead: Lead, actorId?: string) {
    if (!lead.organizationId) {
      return;
    }

    this.leadNotifications.notifyLeadCreated({
      leadName: lead.name,
      organizationId: lead.organizationId,
      companyId: lead.companyId,
      actorId,
    });
  }

  private async createFollowUpReminder(lead: Lead) {
    const existing = await this.prisma.crmReminderTask.findFirst({
      where: { leadId: lead.id, status: 'PENDING' },
      select: { id: true },
    });
    if (existing) return;

    await this.prisma.crmReminderTask.create({
      data: {
        companyId: lead.companyId,
        leadId: lead.id,
        title: `Enviar mensagem para ${lead.name}`,
        dueDate: addBusinessDays(new Date(), 1),
      },
    });
  }

  private toReminderResponse(task: {
    id: string;
    companyId: string;
    leadId: string;
    title: string;
    dueDate: Date;
    status: string;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    lead?: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
    } | null;
  }) {
    return {
      id: task.id,
      companyId: task.companyId,
      leadId: task.leadId,
      title: task.title,
      dueDate: task.dueDate.toISOString(),
      status: task.status,
      completedAt: task.completedAt?.toISOString() ?? null,
      lead: task.lead
        ? {
            id: task.lead.id,
            name: task.lead.name,
            phone: task.lead.phone,
            email: task.lead.email,
          }
        : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private deriveCrmStatusFromPipeline(pipelineStatus: LeadStatus): CrmLeadStatus {
    if (pipelineStatus === LeadStatus.NAO_TEM_INTERESSE) {
      return CrmLeadStatus.NO_INTEREST;
    }

    if (
      pipelineStatus === LeadStatus.VENDA_FINALIZADA ||
      pipelineStatus === LeadStatus.POS_VENDA
    ) {
      return CrmLeadStatus.FINISHED;
    }

    return CrmLeadStatus.ACTIVE;
  }

  private shouldAutoMinimize(crmStatus: CrmLeadStatus): boolean {
    return (
      crmStatus === CrmLeadStatus.FINISHED ||
      crmStatus === CrmLeadStatus.NO_INTEREST
    );
  }

  private async searchLocalLeads(dto: LeadSearchDto) {
    const leads = await this.prisma.lead.findMany({
      where: {
        deletedAt: null,
        AND: [
          {
            OR: [
              { city: { contains: dto.cidade, mode: 'insensitive' } },
              { neighborhood: { contains: dto.bairro, mode: 'insensitive' } },
              { category: { contains: dto.categoria, mode: 'insensitive' } },
              { name: { contains: dto.categoria, mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      source: 'local',
      results: leads.map((lead) => this.toLeadResponse(lead)),
    };
  }

  private async findLocalMappedPlaces(
    dto: FetchMapsLeadsDto,
  ): Promise<MappedPlace[]> {
    const leads = await this.prisma.lead.findMany({
      where: {
        deletedAt: null,
        AND: [
          {
            OR: [
              { city: { contains: dto.city, mode: 'insensitive' } },
              {
                neighborhood: {
                  contains: dto.neighborhood,
                  mode: 'insensitive',
                },
              },
              { category: { contains: dto.category, mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return leads.map((lead) => ({
      name: lead.name,
      phone: lead.phone ?? undefined,
      email: lead.email ?? undefined,
      website: lead.website ?? undefined,
      address: lead.address ?? undefined,
      city: lead.city ?? dto.city,
      neighborhood: lead.neighborhood ?? dto.neighborhood,
      category: lead.category ?? dto.category,
      placeId: lead.placeId ?? undefined,
      rating: lead.rating ?? undefined,
      reviewsCount: lead.reviewsCount ?? undefined,
      latitude: lead.latitude ?? undefined,
      longitude: lead.longitude ?? undefined,
      source: 'local',
      rawData: (lead.rawData as Prisma.InputJsonValue) ?? {
        id: lead.id,
        source: 'local',
      },
    }));
  }

  private toSearchSessionResponse(
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
      statusLabel: LEAD_STATUS_LABELS[lead.status],
      statusColor: LEAD_STATUS_COLORS[lead.status],
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

  private toCrmLeadResponse(lead: Lead) {
    const base = this.toLeadResponse(lead);

    return {
      ...base,
      status: lead.crmStatus,
      pipelineStatus: lead.status,
      pipelineStatusLabel: LEAD_STATUS_LABELS[lead.status],
      pipelineStatusColor: LEAD_STATUS_COLORS[lead.status],
    };
  }

  private async fetchPlacesFromExternalApi(
    dto: FetchMapsLeadsDto,
  ): Promise<MappedPlace[]> {
    const credentials = await this.resolveScraperCredentials();

    if (credentials.apifyApiToken) {
      return this.fetchFromApify(dto, credentials.apifyApiToken);
    }

    const outscraperKey = this.configService.get<string>('OUTSCRAPER_API_KEY');
    if (outscraperKey?.trim()) {
      return this.fetchFromOutscraper(dto, outscraperKey.trim());
    }

    return this.findLocalMappedPlaces(dto);
  }

  private async resolveScraperCredentials() {
    let tenantApifyApiToken: string | null = null;

    try {
      const credentials =
        await this.companySettings.getScraperCredentialsForCurrentTenant();
      tenantApifyApiToken = credentials.apifyApiToken;
    } catch {}

    return {
      apifyApiToken:
        tenantApifyApiToken?.trim() ||
        this.configService.get<string>('APIFY_API_TOKEN')?.trim() ||
        null,
    };
  }

  private async fetchFromOutscraper(
    dto: FetchMapsLeadsDto,
    apiKey: string,
  ): Promise<MappedPlace[]> {
    const query = `${dto.category}, ${dto.neighborhood}, ${dto.city}`;
    const params = new URLSearchParams({
      query,
      limit: String(OUTSCRAPER_LIMIT),
      async: 'false',
      language: 'pt',
      region: 'br',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OUTSCRAPER_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://api.outscraper.com/google-maps-search?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': apiKey,
            Accept: 'application/json',
          },
          signal: controller.signal,
        },
      );

      const bodyText = await response.text();
      let body: unknown;
      try {
        body = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        body = bodyText;
      }

      if (!response.ok) {
        this.logger.warn(
          `Outscraper error ${response.status}: ${bodyText.slice(0, 500)}`,
        );
        throw new BadGatewayException(
          'Falha ao buscar lugares no Outscraper. Tente novamente.',
        );
      }

      return this.mapOutscraperPlaces(body, dto);
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException(
          'A busca no Outscraper excedeu o tempo limite. Tente novamente.',
        );
      }

      this.logger.warn(`Outscraper request failed: ${String(error)}`);
      throw new BadGatewayException('Não foi possível conectar ao Outscraper.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchFromApify(
    dto: FetchMapsLeadsDto,
    token: string,
  ): Promise<MappedPlace[]> {
    const actorId =
      this.configService.get<string>('APIFY_GOOGLE_MAPS_ACTOR') ??
      'compass~crawler-google-places';
    const payload = this.buildApifyActorInput(dto);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), APIFY_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      const bodyText = await response.text();
      let body: unknown;
      try {
        body = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        body = bodyText;
      }

      if (!response.ok) {
        this.logger.warn(
          `Apify error ${response.status}: ${bodyText.slice(0, 500)}`,
        );
        throw new BadGatewayException(
          this.extractApifyErrorMessage(body) ??
            'Falha ao buscar lugares no Apify. Tente novamente.',
        );
      }

      return mapApifyPlaces(body, dto);
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException(
          'A busca no Apify excedeu o tempo limite. Tente novamente.',
        );
      }

      this.logger.warn(`Apify request failed: ${String(error)}`);
      throw new BadGatewayException('Não foi possível conectar ao Apify.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildApifyActorInput(dto: FetchMapsLeadsDto) {
    return buildApifyActorInput(dto, this.resolveApifyMaxResults());
  }

  private resolveApifyMaxResults() {
    const configured = Number(
      this.configService.get<string>('APIFY_MAX_RESULTS'),
    );
    if (!Number.isFinite(configured) || configured <= 0) {
      return APIFY_DEFAULT_MAX_RESULTS;
    }

    return Math.min(
      APIFY_MAX_RESULTS_LIMIT,
      Math.max(1, Math.round(configured)),
    );
  }

  private extractApifyErrorMessage(body: unknown) {
    if (typeof body !== 'object' || body === null) {
      return null;
    }

    const record = body as Record<string, unknown>;
    const error = record.error;
    if (typeof error === 'object' && error !== null) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }

    const message = record.message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }

    return null;
  }

  private mapOutscraperPlaces(
    body: unknown,
    dto: FetchMapsLeadsDto,
  ): MappedPlace[] {
    const places = this.flattenPlaces(body) as OutscraperPlace[];
    const mapped: MappedPlace[] = [];

    for (const place of places) {
      const name =
        typeof place.name === 'string' && place.name.trim()
          ? place.name.trim()
          : null;
      if (!name) continue;

      mapped.push({
        name,
        phone: this.asOptionalString(place.phone),
        email: this.asOptionalString(place.email),
        website: this.asOptionalString(place.site),
        address: this.asOptionalString(place.full_address ?? place.address),
        city: this.asOptionalString(place.city) ?? dto.city,
        neighborhood:
          this.asOptionalString(place.borough ?? place.neighborhood) ??
          dto.neighborhood,
        category:
          this.asOptionalString(place.category ?? place.type) ?? dto.category,
        placeId: this.asOptionalString(place.place_id),
        rating: typeof place.rating === 'number' ? place.rating : undefined,
        reviewsCount:
          typeof place.reviews === 'number' ? place.reviews : undefined,
        latitude:
          typeof place.latitude === 'number' ? place.latitude : undefined,
        longitude:
          typeof place.longitude === 'number' ? place.longitude : undefined,
        source: 'outscraper',
        rawData: place as Prisma.InputJsonValue,
      });
    }

    return mapped;
  }

  private flattenPlaces(body: unknown): unknown[] {
    if (Array.isArray(body)) {
      if (body.length > 0 && Array.isArray(body[0])) {
        return body.flat();
      }
      return body;
    }

    if (typeof body !== 'object' || body === null) {
      return [];
    }

    const record = body as Record<string, unknown>;
    const data = record.data;

    if (Array.isArray(data)) {
      if (data.length > 0 && Array.isArray(data[0])) {
        return data.flat();
      }
      return data;
    }

    return [];
  }

  private asOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
  }
}
