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
exports.LeadSearchSessionService = void 0;
const common_1 = require("@nestjs/common");
const company_constants_1 = require("../../../company/company.constants");
const prisma_service_1 = require("../../../prisma/prisma.service");
const lead_miner_client_1 = require("../infrastructure/lead-miner.client");
const lead_miner_mapper_1 = require("../infrastructure/lead-miner.mapper");
const cnae_resolver_service_1 = require("./cnae-resolver.service");
const company_discovery_service_1 = require("./company-discovery.service");
const registry_signals_util_1 = require("../../qualification/registry-signals.util");
const DEFAULT_MAX_RESULTS = 20;
let LeadSearchSessionService = class LeadSearchSessionService {
    prisma;
    companyDiscovery;
    leadMinerClient;
    cnaeResolver;
    constructor(prisma, companyDiscovery, leadMinerClient, cnaeResolver) {
        this.prisma = prisma;
        this.companyDiscovery = companyDiscovery;
        this.leadMinerClient = leadMinerClient;
        this.cnaeResolver = cnaeResolver;
    }
    async search(tenantId, dto) {
        const resolvedTenantId = tenantId?.trim() || company_constants_1.DEFAULT_COMPANY_ID;
        const queryType = dto.queryType;
        const city = dto.city.trim();
        const uf = dto.uf.trim().toUpperCase();
        const queryValue = dto.queryValue.trim();
        if (!city || !uf || !queryValue) {
            throw new common_1.BadRequestException('queryValue, city and uf are required');
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
        const leads = [];
        for (const candidate of candidates) {
            const existing = await this.findExistingLead(resolvedTenantId, candidate);
            if (existing) {
                const updated = await this.prisma.lead.update({
                    where: { id: existing.id },
                    data: this.buildLeadUpdateFromCandidate(existing, candidate, session.id),
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
                    rawData: (0, registry_signals_util_1.materializeRegistrySnapshotFromRawData)(candidate.rawData, candidate.placeId ??
                        (candidate.cnpj ? `cnpj:${candidate.cnpj}` : undefined)),
                    searchSessionId: session.id,
                    placeId: candidate.placeId ??
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
    async discoverCandidates(dto, params) {
        const maxResults = params.maxResults ?? DEFAULT_MAX_RESULTS;
        if (params.queryType === 'NICHO') {
            return this.discoverViaLeadMiner(params);
        }
        const cnaeClasses = await this.cnaeResolver.resolve('CNAE', params.queryValue);
        const leadMinerCategory = this.cnaeResolver.leadMinerCategory(params.queryValue, cnaeClasses);
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
        return this.mergeDiscoveredCandidates(leadMinerCandidates, registryCandidates, maxResults);
    }
    async discoverViaLeadMiner(params) {
        const neighborhood = params.address?.trim() || params.city.trim();
        const maxResults = params.maxResults ?? 25;
        const records = await this.leadMinerClient.searchAndWait({
            category: params.queryValue,
            city: params.city,
            neighborhood,
            max_results: maxResults,
        });
        return (0, lead_miner_mapper_1.mapLeadMinerRecordsToCandidates)(records, {
            city: params.city,
            neighborhood,
            category: params.queryValue,
        }).slice(0, maxResults);
    }
    mergeDiscoveredCandidates(leadMinerCandidates, registryCandidates, maxResults) {
        const merged = new Map();
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
            const fuzzyMatch = Array.from(merged.values()).find((item) => this.isSameBusiness(item, candidate));
            if (fuzzyMatch) {
                const key = this.buildCandidateKey(fuzzyMatch);
                merged.set(key, this.mergeCandidates(fuzzyMatch, candidate));
                continue;
            }
            merged.set(directKey, candidate);
        }
        return Array.from(merged.values()).slice(0, maxResults);
    }
    mergeCandidates(leadMinerCandidate, registryCandidate) {
        const contact = this.isContactRichSource(leadMinerCandidate.source)
            ? leadMinerCandidate
            : registryCandidate;
        const registry = contact === leadMinerCandidate ? registryCandidate : leadMinerCandidate;
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
            source: contact.source === registry.source
                ? contact.source
                : `${contact.source}+${registry.source}`,
            rawData: {
                leadMiner: contact.rawData,
                registry: registry.rawData,
            },
        };
    }
    isContactRichSource(source) {
        return (source === 'leadminer' ||
            source === 'apify' ||
            source === 'outscraper');
    }
    buildCandidateKey(candidate) {
        if (candidate.placeId) {
            return `place:${candidate.placeId}`;
        }
        if (candidate.cnpj) {
            return `cnpj:${candidate.cnpj}`;
        }
        return `name:${this.normalizeCandidateName(candidate.name)}:${this.normalizeCandidateName(candidate.city ?? '')}`;
    }
    isSameBusiness(left, right) {
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
    normalizeCandidateName(value) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }
    async findExistingLead(tenantId, candidate) {
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
    buildLeadUpdateFromCandidate(existing, candidate, searchSessionId) {
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
            placeId: candidate.placeId ??
                (candidate.cnpj ? `cnpj:${candidate.cnpj}` : undefined) ??
                existing.placeId,
            rawData: (0, registry_signals_util_1.materializeRegistrySnapshotFromRawData)(candidate.rawData, candidate.placeId ??
                (candidate.cnpj ? `cnpj:${candidate.cnpj}` : undefined) ??
                existing.placeId),
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
};
exports.LeadSearchSessionService = LeadSearchSessionService;
exports.LeadSearchSessionService = LeadSearchSessionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        company_discovery_service_1.CompanyDiscoveryService,
        lead_miner_client_1.LeadMinerClient,
        cnae_resolver_service_1.CnaeResolverService])
], LeadSearchSessionService);
//# sourceMappingURL=lead-search-session.service.js.map