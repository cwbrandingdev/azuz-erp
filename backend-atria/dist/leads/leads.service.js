"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LeadsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const ai_service_1 = require("../ai/ai.service");
const company_settings_service_1 = require("../company-settings/company-settings.service");
const prisma_service_1 = require("../prisma/prisma.service");
const business_days_1 = require("./business-days");
const crm_scope_service_1 = require("./crm-scope.service");
const lead_notification_service_1 = require("./lead-notification.service");
const apify_place_mapper_1 = require("./maps-scraper/apify-place.mapper");
const lead_stages_service_1 = require("./lead-stages.service");
const lead_kanban_constants_1 = require("./lead-kanban.constants");
const lead_pipeline_zones_1 = require("./lead-pipeline-zones");
const lead_qualification_service_1 = require("./qualification/lead-qualification.service");
const DEFAULT_SCRAPER_URL = 'https://leadminer-one.vercel.app/api/scraper';
const SCRAPER_TIMEOUT_MS = 120_000;
const OUTSCRAPER_TIMEOUT_MS = 180_000;
const OUTSCRAPER_LIMIT = 25;
const APIFY_TIMEOUT_MS = 180_000;
const APIFY_DEFAULT_MAX_RESULTS = 25;
const APIFY_MAX_RESULTS_LIMIT = 120;
let LeadsService = LeadsService_1 = class LeadsService {
    configService;
    prisma;
    aiService;
    companySettings;
    leadStages;
    crmScope;
    leadNotifications;
    leadQualification;
    logger = new common_1.Logger(LeadsService_1.name);
    constructor(configService, prisma, aiService, companySettings, leadStages, crmScope, leadNotifications, leadQualification) {
        this.configService = configService;
        this.prisma = prisma;
        this.aiService = aiService;
        this.companySettings = companySettings;
        this.leadStages = leadStages;
        this.crmScope = crmScope;
        this.leadNotifications = leadNotifications;
        this.leadQualification = leadQualification;
    }
    async preQualify(user, id) {
        const lead = await this.findLeadForUser(user, id);
        const apifyToken = await this.resolveApifyToken();
        const result = await this.leadQualification.qualifyLead(lead, apifyToken);
        const updated = await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
                aiScore: result.score,
                aiNotes: result.notes,
                rawData: this.leadQualification.mergeInstagramIntoRawData(lead, result.instagram ?? null),
            },
        });
        return this.toLeadResponse(updated);
    }
    async resolveApifyToken() {
        const envToken = this.configService.get('APIFY_API_TOKEN')?.trim();
        if (envToken) {
            return envToken;
        }
        try {
            const credentials = await this.companySettings.getIntegrationCredentialsForCurrentTenant();
            return credentials.apifyApiToken?.trim() || null;
        }
        catch {
            return null;
        }
    }
    async search(dto) {
        const scraperUrl = this.configService.get('LEAD_SCRAPER_URL') ?? DEFAULT_SCRAPER_URL;
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
            let body;
            try {
                body = bodyText ? JSON.parse(bodyText) : null;
            }
            catch {
                body = bodyText;
            }
            if (!response.ok) {
                this.logger.warn(`Lead scraper error ${response.status}: ${bodyText.slice(0, 500)}`);
                return this.searchLocalLeads(dto);
            }
            return body;
        }
        catch (error) {
            this.logger.warn(`Lead scraper request failed: ${String(error)}`);
            return this.searchLocalLeads(dto);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async fetchMaps(dto) {
        const places = await this.fetchPlacesFromExternalApi(dto);
        if (places.length === 0) {
            return [];
        }
        const created = [];
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
    async findAll(user) {
        const orgFilter = user
            ? await this.crmScope.buildLeadOrganizationFilter(user)
            : {};
        const leads = await this.prisma.lead.findMany({
            where: { deletedAt: null, ...orgFilter },
            orderBy: { createdAt: 'desc' },
        });
        return leads.map((lead) => this.toLeadResponse(lead));
    }
    async findAllForCrm(user) {
        const where = {
            deletedAt: null,
            ...(await this.crmScope.buildLeadOrganizationFilter(user)),
        };
        const leads = await this.prisma.lead.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        return leads.map((lead) => this.toCrmLeadResponse(lead));
    }
    async findProspectingLeads(user, organizationId) {
        const where = {
            deletedAt: null,
            ...(await this.crmScope.buildProspectingLeadOrganizationFilter(user, organizationId)),
        };
        const leads = await this.prisma.lead.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        return leads.map((lead) => this.toCrmLeadResponse(lead));
    }
    async toggleLeadCollapse(user, id, isMinimized) {
        const lead = await this.findLeadForUser(user, id);
        const nextMinimized = isMinimized ?? !lead.isMinimized;
        const updated = await this.prisma.lead.update({
            where: { id: lead.id },
            data: { isMinimized: nextMinimized },
        });
        return this.toCrmLeadResponse(updated);
    }
    async findKanbanBoard(user, organizationId) {
        const stages = await this.leadStages.ensureDefaults();
        const orgFilter = await this.crmScope.buildKanbanLeadOrganizationFilter(user, organizationId);
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
                status: stage.key ?? stage.id,
                title: stage.name,
                color: stage.color,
                order: stage.order,
                leads: leads
                    .filter((lead) => lead.stageId
                    ? lead.stageId === stage.id
                    : lead.status === pipelineStatus && stage.key === lead.status)
                    .map((lead) => this.toLeadResponse(lead)),
            };
        });
        return {
            columns,
            total: leads.length,
            crmMoveZone: this.crmScope.getMoveZone(user.role),
        };
    }
    async createForCrm(user, dto) {
        const name = dto.name.trim();
        if (!name) {
            throw new common_1.BadRequestException('name is required');
        }
        const stage = await this.leadStages.resolveStage(dto.stageId);
        const status = this.leadStages.statusFromStage(stage);
        const maxOrder = await this.prisma.lead.aggregate({
            where: { kanbanTracked: true, status },
            _max: { kanbanOrder: true },
        });
        const lead = await this.prisma.lead.create({
            data: {
                name,
                phone: dto.phone,
                email: dto.email,
                website: dto.website,
                address: dto.address,
                city: dto.city,
                neighborhood: dto.neighborhood,
                category: dto.category,
                placeId: dto.placeId,
                source: dto.source ?? 'manual',
                organizationId: await this.resolveOrganizationIdForCreate(user, dto.organizationId),
                status,
                stageId: stage.id,
                crmStatus: this.deriveCrmStatusFromPipeline(status),
                kanbanTracked: true,
                kanbanOrder: (maxOrder._max.kanbanOrder ?? -1) + 1,
            },
        });
        await this.createFollowUpReminder(lead);
        this.notifyOrganizationRepresentatives(lead, user.userId);
        return this.toCrmLeadResponse(lead);
    }
    async findReminderBoard(user) {
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
        ];
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
    async updateReminderStatus(id, status) {
        const existing = await this.prisma.crmReminderTask.findFirst({
            where: { id },
            select: { id: true },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Lembrete não encontrado.');
        }
        const updated = await this.prisma.crmReminderTask.update({
            where: { id },
            data: {
                status,
                completedAt: status === client_1.CrmReminderTaskStatus.DONE ? new Date() : null,
            },
            include: {
                lead: {
                    select: { id: true, name: true, phone: true, email: true },
                },
            },
        });
        return this.toReminderResponse(updated);
    }
    async addToKanban(user, dto) {
        let lead = null;
        if (dto.leadId) {
            lead = await this.findLeadForUser(user, dto.leadId);
        }
        else if (dto.placeId) {
            const orgFilter = await this.crmScope.buildLeadOrganizationFilter(user);
            lead = await this.prisma.lead.findFirst({
                where: { placeId: dto.placeId, deletedAt: null, ...orgFilter },
            });
        }
        if (!lead) {
            const name = dto.name?.trim();
            if (!name) {
                throw new common_1.BadRequestException('Informe leadId ou os dados do lead (name) para adicionar ao kanban.');
            }
            const organizationId = await this.resolveOrganizationIdForCreate(user, dto.organizationId);
            const stage = await this.leadStages.resolveStage();
            const status = this.leadStages.statusFromStage(stage);
            const maxOrder = await this.prisma.lead.aggregate({
                where: { kanbanTracked: true, status },
                _max: { kanbanOrder: true },
            });
            lead = await this.prisma.lead.create({
                data: {
                    name,
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
                    kanbanOrder: (maxOrder._max.kanbanOrder ?? -1) + 1,
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
        const maxOrder = await this.prisma.lead.aggregate({
            where: { kanbanTracked: true, status: client_1.LeadStatus.PRE_VENDA },
            _max: { kanbanOrder: true },
        });
        const stage = await this.leadStages.resolveStage();
        const organizationId = dto.organizationId?.trim();
        if (organizationId) {
            await this.crmScope.assertUserCanManageOrganization(user, organizationId);
        }
        const updated = await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
                kanbanTracked: true,
                status: this.leadStages.statusFromStage(stage),
                stageId: stage.id,
                kanbanOrder: (maxOrder._max.kanbanOrder ?? -1) + 1,
                ...(organizationId ? { organizationId } : {}),
            },
        });
        return this.toLeadResponse(updated);
    }
    async removeFromKanban(user, id) {
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
    async updateLeadStage(user, id, dto) {
        return this.updateStatus(user, id, dto);
    }
    async updateStatus(user, id, dto) {
        const lead = await this.findLeadForUser(user, id);
        if (!dto.status && !dto.stageId) {
            throw new common_1.BadRequestException('Informe status ou stageId.');
        }
        const stage = await this.resolveMoveTarget(dto.stageId, dto.status);
        const status = this.leadStages.statusFromStage(stage);
        try {
            (0, lead_pipeline_zones_1.assertLeadStatusMoveAllowed)(user.role, lead.status, status);
        }
        catch (error) {
            throw new common_1.ForbiddenException(error instanceof Error ? error.message : 'Movimento não permitido.');
        }
        const targetOrder = dto.order ??
            ((await this.prisma.lead.aggregate({
                where: {
                    kanbanTracked: true,
                    status,
                    id: { not: id },
                },
                _max: { kanbanOrder: true },
            }))._max.kanbanOrder ?? -1) + 1;
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
    async qualify(user, id) {
        const lead = await this.findLeadForUser(user, id);
        if (this.crmScope.getMoveZone(user.role) !== 'sdr') {
            throw new common_1.ForbiddenException('Apenas usuários SDR podem qualificar leads.');
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
            ? client_1.LeadStatus.VENDA_FINALIZADA
            : client_1.LeadStatus.NAO_TEM_INTERESSE;
        const crmStatus = this.deriveCrmStatusFromPipeline(pipelineStatus);
        const stage = await this.resolveStageForStatus(pipelineStatus);
        const updated = await this.prisma.lead.update({
            where: { id },
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
    async getComments(user, leadId) {
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
    async createComment(user, userId, leadId, content) {
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
    async findLeadForUser(user, id) {
        const orgFilter = await this.crmScope.buildLeadOrganizationFilter(user);
        const lead = await this.prisma.lead.findFirst({
            where: { id, deletedAt: null, ...orgFilter },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead não encontrado.');
        }
        return lead;
    }
    async resolveOrganizationIdForCreate(user, requestedOrganizationId) {
        const organizationId = requestedOrganizationId?.trim();
        if (!organizationId) {
            throw new common_1.BadRequestException('organizationId is required');
        }
        await this.crmScope.assertUserCanManageOrganization(user, organizationId);
        return organizationId;
    }
    async ensureLeadExists(id) {
        const lead = await this.prisma.lead.findFirst({
            where: { id, deletedAt: null },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead não encontrado.');
        }
        return lead;
    }
    async resolveMoveTarget(stageId, status) {
        if (stageId) {
            return this.leadStages.resolveStage(stageId);
        }
        if (status) {
            const normalized = status.toUpperCase();
            if (this.isLeadStatus(normalized)) {
                return this.resolveStageForStatus(normalized);
            }
            return this.leadStages.resolveStage(status);
        }
        throw new common_1.BadRequestException('Informe status ou stageId.');
    }
    async resolveStageForStatus(status) {
        const stages = await this.leadStages.ensureDefaults();
        return (stages.find((stage) => stage.key === status) ??
            stages[0]);
    }
    isLeadStatus(value) {
        return Object.values(client_1.LeadStatus).includes(value);
    }
    notifyOrganizationRepresentatives(lead, actorId) {
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
    async createFollowUpReminder(lead) {
        const existing = await this.prisma.crmReminderTask.findFirst({
            where: { leadId: lead.id, status: 'PENDING' },
            select: { id: true },
        });
        if (existing)
            return;
        await this.prisma.crmReminderTask.create({
            data: {
                companyId: lead.companyId,
                leadId: lead.id,
                title: `Enviar mensagem para ${lead.name}`,
                dueDate: (0, business_days_1.addBusinessDays)(new Date(), 1),
            },
        });
    }
    toReminderResponse(task) {
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
    deriveCrmStatusFromPipeline(pipelineStatus) {
        if (pipelineStatus === client_1.LeadStatus.NAO_TEM_INTERESSE) {
            return client_1.CrmLeadStatus.NO_INTEREST;
        }
        if (pipelineStatus === client_1.LeadStatus.VENDA_FINALIZADA ||
            pipelineStatus === client_1.LeadStatus.POS_VENDA ||
            pipelineStatus === client_1.LeadStatus.AGUARDANDO_ENTREGA) {
            return client_1.CrmLeadStatus.FINISHED;
        }
        return client_1.CrmLeadStatus.ACTIVE;
    }
    shouldAutoMinimize(crmStatus) {
        return (crmStatus === client_1.CrmLeadStatus.FINISHED ||
            crmStatus === client_1.CrmLeadStatus.NO_INTEREST);
    }
    async searchLocalLeads(dto) {
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
    async findLocalMappedPlaces(dto) {
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
            rawData: lead.rawData ?? {
                id: lead.id,
                source: 'local',
            },
        }));
    }
    toLeadResponse(lead) {
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
            statusLabel: lead_kanban_constants_1.LEAD_STATUS_LABELS[lead.status],
            statusColor: lead_kanban_constants_1.LEAD_STATUS_COLORS[lead.status],
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
    toCrmLeadResponse(lead) {
        const base = this.toLeadResponse(lead);
        return {
            ...base,
            status: lead.crmStatus,
            pipelineStatus: lead.status,
            pipelineStatusLabel: lead_kanban_constants_1.LEAD_STATUS_LABELS[lead.status],
            pipelineStatusColor: lead_kanban_constants_1.LEAD_STATUS_COLORS[lead.status],
        };
    }
    async fetchPlacesFromExternalApi(dto) {
        const credentials = await this.resolveScraperCredentials();
        if (credentials.apifyApiToken) {
            return this.fetchFromApify(dto, credentials.apifyApiToken);
        }
        const outscraperKey = this.configService.get('OUTSCRAPER_API_KEY');
        if (outscraperKey?.trim()) {
            return this.fetchFromOutscraper(dto, outscraperKey.trim());
        }
        return this.findLocalMappedPlaces(dto);
    }
    async resolveScraperCredentials() {
        let tenantApifyApiToken = null;
        try {
            const credentials = await this.companySettings.getScraperCredentialsForCurrentTenant();
            tenantApifyApiToken = credentials.apifyApiToken;
        }
        catch { }
        return {
            apifyApiToken: tenantApifyApiToken?.trim() ||
                this.configService.get('APIFY_API_TOKEN')?.trim() ||
                null,
        };
    }
    async fetchFromOutscraper(dto, apiKey) {
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
            const response = await fetch(`https://api.outscraper.com/google-maps-search?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'X-API-KEY': apiKey,
                    Accept: 'application/json',
                },
                signal: controller.signal,
            });
            const bodyText = await response.text();
            let body;
            try {
                body = bodyText ? JSON.parse(bodyText) : null;
            }
            catch {
                body = bodyText;
            }
            if (!response.ok) {
                this.logger.warn(`Outscraper error ${response.status}: ${bodyText.slice(0, 500)}`);
                throw new common_1.BadGatewayException('Falha ao buscar lugares no Outscraper. Tente novamente.');
            }
            return this.mapOutscraperPlaces(body, dto);
        }
        catch (error) {
            if (error instanceof common_1.BadGatewayException)
                throw error;
            if (error instanceof Error && error.name === 'AbortError') {
                throw new common_1.RequestTimeoutException('A busca no Outscraper excedeu o tempo limite. Tente novamente.');
            }
            this.logger.warn(`Outscraper request failed: ${String(error)}`);
            throw new common_1.BadGatewayException('Não foi possível conectar ao Outscraper.');
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async fetchFromApify(dto, token) {
        const actorId = this.configService.get('APIFY_GOOGLE_MAPS_ACTOR') ??
            'compass~crawler-google-places';
        const payload = this.buildApifyActorInput(dto);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), APIFY_TIMEOUT_MS);
        try {
            const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            const bodyText = await response.text();
            let body;
            try {
                body = bodyText ? JSON.parse(bodyText) : null;
            }
            catch {
                body = bodyText;
            }
            if (!response.ok) {
                this.logger.warn(`Apify error ${response.status}: ${bodyText.slice(0, 500)}`);
                throw new common_1.BadGatewayException(this.extractApifyErrorMessage(body) ??
                    'Falha ao buscar lugares no Apify. Tente novamente.');
            }
            return (0, apify_place_mapper_1.mapApifyPlaces)(body, dto);
        }
        catch (error) {
            if (error instanceof common_1.BadGatewayException)
                throw error;
            if (error instanceof Error && error.name === 'AbortError') {
                throw new common_1.RequestTimeoutException('A busca no Apify excedeu o tempo limite. Tente novamente.');
            }
            this.logger.warn(`Apify request failed: ${String(error)}`);
            throw new common_1.BadGatewayException('Não foi possível conectar ao Apify.');
        }
        finally {
            clearTimeout(timeout);
        }
    }
    buildApifyActorInput(dto) {
        return (0, apify_place_mapper_1.buildApifyActorInput)(dto, this.resolveApifyMaxResults());
    }
    resolveApifyMaxResults() {
        const configured = Number(this.configService.get('APIFY_MAX_RESULTS'));
        if (!Number.isFinite(configured) || configured <= 0) {
            return APIFY_DEFAULT_MAX_RESULTS;
        }
        return Math.min(APIFY_MAX_RESULTS_LIMIT, Math.max(1, Math.round(configured)));
    }
    extractApifyErrorMessage(body) {
        if (typeof body !== 'object' || body === null) {
            return null;
        }
        const record = body;
        const error = record.error;
        if (typeof error === 'object' && error !== null) {
            const message = error.message;
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
    mapOutscraperPlaces(body, dto) {
        const places = this.flattenPlaces(body);
        const mapped = [];
        for (const place of places) {
            const name = typeof place.name === 'string' && place.name.trim()
                ? place.name.trim()
                : null;
            if (!name)
                continue;
            mapped.push({
                name,
                phone: this.asOptionalString(place.phone),
                email: this.asOptionalString(place.email),
                website: this.asOptionalString(place.site),
                address: this.asOptionalString(place.full_address ?? place.address),
                city: this.asOptionalString(place.city) ?? dto.city,
                neighborhood: this.asOptionalString(place.borough ?? place.neighborhood) ??
                    dto.neighborhood,
                category: this.asOptionalString(place.category ?? place.type) ?? dto.category,
                placeId: this.asOptionalString(place.place_id),
                rating: typeof place.rating === 'number' ? place.rating : undefined,
                reviewsCount: typeof place.reviews === 'number' ? place.reviews : undefined,
                latitude: typeof place.latitude === 'number' ? place.latitude : undefined,
                longitude: typeof place.longitude === 'number' ? place.longitude : undefined,
                source: 'outscraper',
                rawData: place,
            });
        }
        return mapped;
    }
    flattenPlaces(body) {
        if (Array.isArray(body)) {
            if (body.length > 0 && Array.isArray(body[0])) {
                return body.flat();
            }
            return body;
        }
        if (typeof body !== 'object' || body === null) {
            return [];
        }
        const record = body;
        const data = record.data;
        if (Array.isArray(data)) {
            if (data.length > 0 && Array.isArray(data[0])) {
                return data.flat();
            }
            return data;
        }
        return [];
    }
    asOptionalString(value) {
        if (typeof value !== 'string')
            return undefined;
        const trimmed = value.trim();
        return trimmed || undefined;
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = LeadsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        ai_service_1.AiService,
        company_settings_service_1.CompanySettingsService,
        lead_stages_service_1.LeadStagesService,
        crm_scope_service_1.CrmScopeService,
        lead_notification_service_1.LeadNotificationService,
        lead_qualification_service_1.LeadQualificationService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map