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
exports.ProspectCompanyCatalogService = exports.CATALOG_DEFAULT_PAGE_SIZE = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../../prisma/prisma.service");
const text_normalize_1 = require("../domain/text-normalize");
const registry_company_qualifier_1 = require("../../qualification/registry-company-qualifier");
exports.CATALOG_DEFAULT_PAGE_SIZE = 25;
let ProspectCompanyCatalogService = class ProspectCompanyCatalogService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async searchPage(params) {
        const page = Math.max(1, Math.round(params.page ?? 1));
        const pageSize = Math.min(100, Math.max(1, Math.round(params.pageSize ?? exports.CATALOG_DEFAULT_PAGE_SIZE)));
        const uf = params.uf.trim().toUpperCase();
        const cityNormalized = (0, text_normalize_1.normalizeCatalogText)(params.city);
        const neighborhoodNormalized = params.neighborhood
            ? (0, text_normalize_1.normalizeCatalogText)(params.neighborhood)
            : '';
        const exactCodes = this.uniqueCodes(params.cnaeCodes, 7);
        const prefixes = this.uniquePrefixes(params.cnaeCodes, params.queryValue);
        const name = params.name?.trim() ?? '';
        const openedFrom = this.parseDayStart(params.openedFrom);
        const openedTo = this.parseDayEnd(params.openedTo, params.openedFrom);
        const stages = [
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
            if (stage.cnaeMode === 'exact' &&
                exactCodes.length === 0 &&
                prefixes.length === 0) {
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
            const totalCount = await this.prisma.prospectCompany.count({ where });
            if (totalCount === 0) {
                continue;
            }
            const effectivePageSize = params.maxResults != null && params.maxResults > 0
                ? Math.min(pageSize, params.maxResults)
                : pageSize;
            const skip = (page - 1) * effectivePageSize;
            const rows = await this.prisma.prospectCompany.findMany({
                where,
                orderBy: [{ blendedScore: 'desc' }, { cnpj: 'asc' }],
                skip,
                take: effectivePageSize,
            });
            return {
                items: rows.map((row) => this.toCandidate(row)),
                totalCount: params.maxResults != null && params.maxResults > 0
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
    buildWhere(input) {
        const nameNormalized = (0, text_normalize_1.normalizeCatalogText)(input.name);
        return {
            uf: input.uf,
            verdict: { not: client_1.ProspectFitVerdict.do_not_prioritize },
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
                this.buildCnaeFilter(input.cnaeMode === 'exact' ? input.exactCodes : [], input.cnaeMode === 'prefix' || input.exactCodes.length === 0
                    ? input.prefixes
                    : []),
            ],
        };
    }
    buildCnaeFilter(exactCodes, prefixes) {
        const or = [];
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
    uniqueCodes(codes, minLength) {
        return Array.from(new Set(codes
            .map((code) => code.replace(/\D/g, ''))
            .filter((code) => code.length >= minLength)));
    }
    uniquePrefixes(codes, queryValue) {
        const fromCodes = this.uniqueCodes(codes, 5).map((code) => code.slice(0, 5));
        const fromQuery = queryValue.replace(/\D/g, '');
        if (fromQuery.length >= 5) {
            fromCodes.push(fromQuery.slice(0, 5));
        }
        return Array.from(new Set(fromCodes.filter((code) => code.length >= 5)));
    }
    parseDayStart(value) {
        const day = value?.trim();
        if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
            return null;
        }
        const date = new Date(`${day}T00:00:00.000Z`);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    parseDayEnd(openedTo, openedFrom) {
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
    toCandidate(row) {
        const name = row.tradeName?.trim() || row.legalName;
        const qualification = (0, registry_company_qualifier_1.qualifyRegistryCompany)({
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
};
exports.ProspectCompanyCatalogService = ProspectCompanyCatalogService;
exports.ProspectCompanyCatalogService = ProspectCompanyCatalogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProspectCompanyCatalogService);
//# sourceMappingURL=prospect-company-catalog.service.js.map