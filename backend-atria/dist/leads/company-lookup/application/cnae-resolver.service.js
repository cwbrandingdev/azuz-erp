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
exports.CnaeResolverService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const ibge_cnae_client_1 = require("../infrastructure/ibge-cnae.client");
const text_normalize_1 = require("../domain/text-normalize");
const CNAE_SEARCH_DEFAULT_LIMIT = 40;
const CNAE_SUBCLASS_DESCRIPTIONS = {
    '9602501': 'Cabeleireiros, barbearia, manicure e pedicure',
    '9602502': 'Atividades de estética e outros serviços de cuidados com a beleza',
};
let CnaeResolverService = class CnaeResolverService {
    prisma;
    ibgeCnaeClient;
    constructor(prisma, ibgeCnaeClient) {
        this.prisma = prisma;
        this.ibgeCnaeClient = ibgeCnaeClient;
    }
    async search(query, limit = CNAE_SEARCH_DEFAULT_LIMIT) {
        const catalog = await this.loadCatalog();
        const normalizedQuery = query.trim();
        if (!normalizedQuery) {
            return catalog.slice(0, limit);
        }
        const normalizedCode = this.normalizeCnaeCode(normalizedQuery);
        const normalizedText = this.normalizeText(normalizedQuery);
        const matches = catalog.filter((item) => {
            const codeMatch = normalizedCode.length > 0 &&
                (item.id.includes(normalizedCode) ||
                    this.codesMatch(normalizedCode, item.id));
            const descriptionMatch = this.normalizeText(item.description).includes(normalizedText);
            return codeMatch || descriptionMatch;
        });
        matches.sort((left, right) => {
            const delta = this.rankMatch(right, normalizedCode, normalizedText) -
                this.rankMatch(left, normalizedCode, normalizedText);
            if (delta !== 0) {
                return delta;
            }
            return left.description.localeCompare(right.description, 'pt-BR');
        });
        return matches.slice(0, limit);
    }
    async resolve(_queryType, queryValue) {
        const catalog = await this.loadCatalog();
        const normalizedQuery = queryValue.trim();
        const targetCode = this.normalizeCnaeCode(normalizedQuery);
        if (targetCode.length >= 5) {
            const exact = catalog.filter((item) => item.id === targetCode ||
                (targetCode.length < 7 && item.id.startsWith(targetCode)));
            if (exact.length > 0) {
                return exact;
            }
            return [
                {
                    id: targetCode,
                    description: catalog.find((item) => item.id === targetCode)?.description ??
                        CNAE_SUBCLASS_DESCRIPTIONS[targetCode] ??
                        `CNAE ${this.formatSubclassCode(targetCode)}`,
                },
            ];
        }
        const normalizedText = this.normalizeText(normalizedQuery);
        const matches = catalog.filter((item) => this.normalizeText(item.description).includes(normalizedText));
        return matches.slice(0, 12);
    }
    cnaeFilterCodes(resolved) {
        const codes = resolved.map((item) => this.normalizeCnaeCode(item.id));
        return Array.from(new Set(codes.filter(Boolean)));
    }
    formatSubclassCode(digits) {
        const code = this.normalizeCnaeCode(digits);
        if (code.length !== 7) {
            return digits;
        }
        return `${code.slice(0, 2)}.${code.slice(2, 4)}-${code[4]}/${code.slice(5, 7)}`;
    }
    async loadCatalog() {
        const rows = await this.prisma.prospectCnae.findMany({
            orderBy: { code: 'asc' },
        });
        const unique = new Map();
        for (const row of rows) {
            unique.set(row.code, {
                id: row.code,
                description: row.description,
            });
        }
        for (const [id, description] of Object.entries(CNAE_SUBCLASS_DESCRIPTIONS)) {
            if (!unique.has(id)) {
                unique.set(id, { id, description });
            }
        }
        const sevenDigitCount = [...unique.keys()].filter((code) => code.length === 7).length;
        if (sevenDigitCount < 200) {
            const subclasses = await this.ibgeCnaeClient.listSubclasses().catch(() => []);
            for (const item of subclasses) {
                if (!unique.has(item.id)) {
                    unique.set(item.id, item);
                }
            }
        }
        if (unique.size === 0) {
            const classes = await this.ibgeCnaeClient.listClasses().catch(() => []);
            for (const item of classes) {
                unique.set(item.id, item);
            }
        }
        return Array.from(unique.values());
    }
    rankMatch(item, code, text) {
        let score = 0;
        const description = this.normalizeText(item.description);
        if (code && item.id === code) {
            score += 1000;
        }
        else if (code && item.id.startsWith(code)) {
            score += 600;
        }
        else if (code && item.id.includes(code)) {
            score += 200;
        }
        if (text && description.startsWith(text)) {
            score += 800;
        }
        else if (text && description.includes(text)) {
            score += 400;
        }
        if (item.id.length === 7) {
            score += 80;
        }
        return score;
    }
    codesMatch(targetCode, itemId) {
        return (itemId === targetCode ||
            itemId.startsWith(targetCode) ||
            targetCode.startsWith(itemId));
    }
    normalizeCnaeCode(value) {
        return value.replace(/\D/g, '');
    }
    normalizeText(value) {
        return (0, text_normalize_1.normalizeCatalogText)(value);
    }
};
exports.CnaeResolverService = CnaeResolverService;
exports.CnaeResolverService = CnaeResolverService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ibge_cnae_client_1.IbgeCnaeClient])
], CnaeResolverService);
//# sourceMappingURL=cnae-resolver.service.js.map