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
exports.LeadSearchSessionService = exports.CATALOG_PREVIEW_ID_PREFIX = void 0;
exports.catalogPreviewId = catalogPreviewId;
exports.isCatalogPreviewId = isCatalogPreviewId;
const common_1 = require("@nestjs/common");
const company_constants_1 = require("../../../company/company.constants");
const prisma_service_1 = require("../../../prisma/prisma.service");
const cnae_resolver_service_1 = require("./cnae-resolver.service");
const prospect_company_catalog_service_1 = require("./prospect-company-catalog.service");
const registry_signals_util_1 = require("../../qualification/registry-signals.util");
exports.CATALOG_PREVIEW_ID_PREFIX = 'external:cnpj:';
function catalogPreviewId(cnpj) {
    return `${exports.CATALOG_PREVIEW_ID_PREFIX}${cnpj}`;
}
function isCatalogPreviewId(id) {
    return id.startsWith(exports.CATALOG_PREVIEW_ID_PREFIX);
}
let LeadSearchSessionService = class LeadSearchSessionService {
    prisma;
    prospectCatalog;
    cnaeResolver;
    constructor(prisma, prospectCatalog, cnaeResolver) {
        this.prisma = prisma;
        this.prospectCatalog = prospectCatalog;
        this.cnaeResolver = cnaeResolver;
    }
    async search(tenantId, dto) {
        const resolvedTenantId = tenantId?.trim() || company_constants_1.DEFAULT_COMPANY_ID;
        const queryType = (dto.queryType ?? 'CNAE');
        const city = dto.city.trim();
        const uf = dto.uf.trim().toUpperCase();
        const queryValue = dto.queryValue.trim();
        if (!city || !uf || !queryValue) {
            throw new common_1.BadRequestException('queryValue, city and uf are required');
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
        const leads = await this.hydrateCandidates(resolvedTenantId, session.id, discovered);
        return {
            session: this.toSessionResponse(session, leads.length),
            leads,
        };
    }
    async listSessions(tenantId) {
        const resolvedTenantId = tenantId?.trim() || company_constants_1.DEFAULT_COMPANY_ID;
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
    async getSessionLeads(tenantId, sessionId) {
        const resolvedTenantId = tenantId?.trim() || company_constants_1.DEFAULT_COMPANY_ID;
        const session = await this.prisma.leadSearchSession.findFirst({
            where: {
                id: sessionId,
                tenantId: resolvedTenantId,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Search session not found');
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
        const leads = await this.hydrateCandidates(resolvedTenantId, session.id, discovered);
        return {
            session: this.toSessionResponse(session, leads.length),
            leads,
        };
    }
    async discoverCandidates(params) {
        const cnaeClasses = await this.cnaeResolver.resolve(params.queryType, params.queryValue);
        return this.prospectCatalog.search({
            queryValue: params.queryValue,
            city: params.city,
            uf: params.uf,
            neighborhood: params.address,
            cnaeCodes: this.cnaeResolver.cnaeFilterCodes(cnaeClasses),
            maxResults: params.maxResults ?? prospect_company_catalog_service_1.DEFAULT_CATALOG_MAX_RESULTS,
        });
    }
    async hydrateCandidates(tenantId, sessionId, candidates) {
        const placeIds = candidates
            .map((candidate) => candidate.placeId)
            .filter((placeId) => Boolean(placeId));
        const existing = placeIds.length === 0
            ? []
            : await this.prisma.lead.findMany({
                where: {
                    companyId: tenantId,
                    deletedAt: null,
                    placeId: { in: placeIds },
                },
            });
        const byPlaceId = new Map();
        for (const lead of existing) {
            if (!lead.placeId)
                continue;
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
    candidateScore(candidate) {
        return 'aiScore' in candidate && typeof candidate.aiScore === 'number'
            ? candidate.aiScore
            : undefined;
    }
    candidateNotes(candidate) {
        return 'aiNotes' in candidate && typeof candidate.aiNotes === 'string'
            ? candidate.aiNotes
            : undefined;
    }
    toPreviewLeadResponse(tenantId, sessionId, candidate) {
        const now = new Date().toISOString();
        const placeId = candidate.placeId ??
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
            status: 'PRE_VENDA',
            stageId: null,
            crmStatus: 'ACTIVE',
            isMinimized: false,
            kanbanTracked: false,
            kanbanOrder: 0,
            aiScore: this.candidateScore(candidate) ?? null,
            aiNotes: this.candidateNotes(candidate) ?? null,
            source: candidate.source,
            rawData: (0, registry_signals_util_1.materializeRegistrySnapshotFromRawData)(candidate.rawData, placeId),
            createdAt: now,
            updatedAt: now,
        };
    }
    toSessionResponse(session, leadsCount) {
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
    toLeadResponse(lead) {
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
            orcamento: lead.orcamento == null ? null : Number(lead.orcamento),
            aiScore: lead.aiScore,
            aiNotes: lead.aiNotes,
            source: lead.source,
            rawData: lead.rawData,
            createdAt: lead.createdAt.toISOString(),
            updatedAt: lead.updatedAt.toISOString(),
        };
    }
};
exports.LeadSearchSessionService = LeadSearchSessionService;
exports.LeadSearchSessionService = LeadSearchSessionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        prospect_company_catalog_service_1.ProspectCompanyCatalogService,
        cnae_resolver_service_1.CnaeResolverService])
], LeadSearchSessionService);
//# sourceMappingURL=lead-search-session.service.js.map