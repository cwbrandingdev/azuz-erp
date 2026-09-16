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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadminerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ai_service_1 = require("../ai/ai.service");
const company_settings_service_1 = require("../company-settings/company-settings.service");
const lead_stages_service_1 = require("../leads/lead-stages.service");
const crm_scope_service_1 = require("../leads/crm-scope.service");
const lead_kanban_constants_1 = require("../leads/lead-kanban.constants");
const prisma_service_1 = require("../prisma/prisma.service");
const lead_miner_client_1 = require("../leads/company-lookup/infrastructure/lead-miner.client");
const DEFAULT_LEADMINER_API = 'https://lead-miner.fly.dev';
let LeadminerService = class LeadminerService {
    configService;
    prisma;
    aiService;
    companySettings;
    leadStages;
    crmScope;
    constructor(configService, prisma, aiService, companySettings, leadStages, crmScope) {
        this.configService = configService;
        this.prisma = prisma;
        this.aiService = aiService;
        this.companySettings = companySettings;
        this.leadStages = leadStages;
        this.crmScope = crmScope;
    }
    getLeadMinerBaseUrl() {
        const baseURL = this.configService.get('LEADMINER_API')?.trim() ||
            DEFAULT_LEADMINER_API;
        return baseURL.replace(/\/$/, '');
    }
    async SearchLeads(payload) {
        const url = `${this.getLeadMinerBaseUrl()}/leads/search`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return (await response.json());
        }
        catch (err) {
            console.error(err);
            throw err;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async getJobStatus(jobId) {
        const url = `${this.getLeadMinerBaseUrl()}/leads/job/${encodeURIComponent(jobId)}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
            });
            if (response.status === 404) {
                throw new common_1.NotFoundException('Job ID not found');
            }
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return (await response.json());
        }
        catch (err) {
            if (err instanceof common_1.NotFoundException) {
                throw err;
            }
            console.error(err);
            throw err;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async importLeads(dto) {
        const addToKanban = dto.addToKanban === true;
        if (addToKanban || dto.organizationId) {
            await this.crmScope.assertOrganizationAllowsLeadCreation(dto.organizationId);
        }
        const created = [];
        for (const item of dto.leads) {
            const phone = item.phone?.trim();
            const name = item.title?.trim() || phone;
            if (!phone || !name)
                continue;
            const existing = await this.prisma.lead.findFirst({
                where: {
                    deletedAt: null,
                    phone,
                    name: { equals: name, mode: 'insensitive' },
                },
            });
            if (existing) {
                if (addToKanban && !existing.kanbanTracked) {
                    const tracked = await this.markLeadForKanban(existing.id);
                    created.push(tracked);
                }
                else {
                    created.push(existing);
                }
                continue;
            }
            const contact = (0, lead_miner_client_1.parseLeadMinerWebsiteAndInstagram)(item.website, item.instagram);
            const baseData = {
                name,
                phone,
                website: contact.website,
                instagram: contact.instagram,
                address: item.address,
                city: dto.city,
                neighborhood: dto.neighborhood,
                category: dto.category,
                rating: item.rating,
                reviewsCount: item.reviews,
                source: 'leadminer',
                rawData: item,
                organizationId: dto.organizationId ?? null,
            };
            if (addToKanban) {
                const stage = await this.leadStages.resolveStage();
                const status = this.leadStages.statusFromStage(stage);
                const maxOrder = await this.prisma.lead.aggregate({
                    where: { kanbanTracked: true, status },
                    _max: { kanbanOrder: true },
                });
                const lead = await this.prisma.lead.create({
                    data: {
                        ...baseData,
                        status,
                        stageId: stage.id,
                        kanbanTracked: true,
                        kanbanOrder: (maxOrder._max.kanbanOrder ?? -1) + 1,
                    },
                });
                created.push(lead);
                continue;
            }
            const lead = await this.prisma.lead.create({ data: baseData });
            created.push(lead);
        }
        return created.map((lead) => this.toLeadResponse(lead));
    }
    async markLeadForKanban(leadId) {
        const stage = await this.leadStages.resolveStage();
        const status = this.leadStages.statusFromStage(stage);
        const maxOrder = await this.prisma.lead.aggregate({
            where: { kanbanTracked: true, status },
            _max: { kanbanOrder: true },
        });
        return this.prisma.lead.update({
            where: { id: leadId },
            data: {
                kanbanTracked: true,
                status,
                stageId: stage.id,
                kanbanOrder: (maxOrder._max.kanbanOrder ?? -1) + 1,
            },
        });
    }
    toLeadResponse(lead) {
        return {
            id: lead.id,
            companyId: lead.companyId,
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
            statusLabel: lead_kanban_constants_1.LEAD_STATUS_LABELS[lead.status],
            statusColor: lead_kanban_constants_1.LEAD_STATUS_COLORS[lead.status],
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
};
exports.LeadminerService = LeadminerService;
exports.LeadminerService = LeadminerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        ai_service_1.AiService,
        company_settings_service_1.CompanySettingsService,
        lead_stages_service_1.LeadStagesService,
        crm_scope_service_1.CrmScopeService])
], LeadminerService);
//# sourceMappingURL=leadminer.service.js.map