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
exports.ProspectCompanyCatalogService = exports.CATALOG_MAX_RESULTS_LIMIT = exports.DEFAULT_CATALOG_MAX_RESULTS = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../../prisma/prisma.service");
const text_normalize_1 = require("../domain/text-normalize");
const registry_company_qualifier_1 = require("../../qualification/registry-company-qualifier");
exports.DEFAULT_CATALOG_MAX_RESULTS = 100;
exports.CATALOG_MAX_RESULTS_LIMIT = 100;
let ProspectCompanyCatalogService = class ProspectCompanyCatalogService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async search(params) {
        const take = this.resolveLimit(params.maxResults);
        const uf = params.uf.trim().toUpperCase();
        const cityNormalized = (0, text_normalize_1.normalizeCatalogText)(params.city);
        const neighborhoodNormalized = params.neighborhood
            ? (0, text_normalize_1.normalizeCatalogText)(params.neighborhood)
            : '';
        const exactCodes = this.uniqueCodes(params.cnaeCodes, 7);
        const prefixes = this.uniquePrefixes(params.cnaeCodes, params.queryValue);
        const collected = [];
        const seen = new Set();
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
            if (collected.length >= take) {
                break;
            }
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
            const rows = await this.prisma.prospectCompany.findMany({
                where: this.buildWhere({
                    uf,
                    cityNormalized: stage.useCity ? cityNormalized : '',
                    neighborhoodNormalized: stage.useNeighborhood
                        ? neighborhoodNormalized
                        : '',
                    exactCodes,
                    prefixes,
                    cnaeMode: stage.cnaeMode,
                    excludeCnpjs: [...seen],
                }),
                orderBy: { blendedScore: 'desc' },
                take: take - collected.length,
            });
            for (const row of rows) {
                if (seen.has(row.cnpj)) {
                    continue;
                }
                seen.add(row.cnpj);
                collected.push(row);
            }
        }
        return collected.map((row) => this.toCandidate(row));
    }
    buildWhere(input) {
        return {
            uf: input.uf,
            verdict: { not: client_1.ProspectFitVerdict.do_not_prioritize },
            ...(input.excludeCnpjs.length > 0
                ? { cnpj: { notIn: input.excludeCnpjs } }
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
    resolveLimit(maxResults) {
        if (!maxResults || maxResults <= 0) {
            return exports.DEFAULT_CATALOG_MAX_RESULTS;
        }
        return Math.min(exports.CATALOG_MAX_RESULTS_LIMIT, Math.round(maxResults));
    }
};
exports.ProspectCompanyCatalogService = ProspectCompanyCatalogService;
exports.ProspectCompanyCatalogService = ProspectCompanyCatalogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProspectCompanyCatalogService);
//# sourceMappingURL=prospect-company-catalog.service.js.map