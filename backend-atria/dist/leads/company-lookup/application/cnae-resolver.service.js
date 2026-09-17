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
const ibge_cnae_client_1 = require("../infrastructure/ibge-cnae.client");
const CNAE_SEARCH_DEFAULT_LIMIT = 30;
const CNAE_SUBCLASS_DESCRIPTIONS = {
    '9602501': 'Cabeleireiros, barbearia, manicure e pedicure',
    '9602502': 'Atividades de estética e outros serviços de cuidados com a beleza',
};
let CnaeResolverService = class CnaeResolverService {
    ibgeCnaeClient;
    constructor(ibgeCnaeClient) {
        this.ibgeCnaeClient = ibgeCnaeClient;
    }
    async search(query, limit = CNAE_SEARCH_DEFAULT_LIMIT) {
        const normalizedQuery = query.trim();
        const classes = await this.ibgeCnaeClient.listClasses();
        if (!normalizedQuery) {
            return classes.slice(0, limit).map((item) => ({
                id: item.id,
                description: item.description,
            }));
        }
        const normalizedCode = this.normalizeCnaeCode(normalizedQuery);
        const normalizedText = this.normalizeText(normalizedQuery);
        const matches = classes.filter((item) => {
            const codeMatch = normalizedCode.length > 0 && this.codesMatch(normalizedCode, item.id);
            const descriptionMatch = this.normalizeText(item.description).includes(normalizedText);
            return codeMatch || descriptionMatch;
        });
        const results = matches.map((item) => ({
            id: item.id,
            description: item.description,
        }));
        if (normalizedCode.length === 7) {
            const subclass = this.subclassInfo(normalizedCode);
            if (subclass && !results.some((item) => item.id === subclass.id)) {
                results.unshift(subclass);
            }
        }
        return results.slice(0, limit);
    }
    async resolve(queryType, queryValue) {
        const normalizedQuery = queryValue.trim();
        const classes = await this.ibgeCnaeClient.listClasses();
        if (queryType === 'CNAE') {
            const targetCode = this.normalizeCnaeCode(normalizedQuery);
            const ibgeMatches = classes.filter((item) => this.codesMatch(targetCode, item.id));
            const resolved = [];
            if (targetCode.length === 7) {
                const subclass = this.subclassInfo(targetCode);
                if (subclass) {
                    resolved.push(subclass);
                }
            }
            const bestIbge = this.pickMostSpecific(ibgeMatches);
            if (bestIbge) {
                resolved.push(bestIbge);
            }
            if (resolved.length > 0) {
                return resolved;
            }
            return [
                {
                    id: targetCode,
                    description: this.subclassInfo(targetCode)?.description ??
                        `CNAE ${this.formatSubclassCode(targetCode)}`,
                },
            ];
        }
        const normalizedNiche = this.normalizeText(normalizedQuery);
        const matches = classes.filter((item) => this.normalizeText(item.description).includes(normalizedNiche));
        return matches.slice(0, 5);
    }
    leadMinerCategory(queryValue, resolved) {
        const targetCode = this.normalizeCnaeCode(queryValue.trim());
        if (targetCode.length === 7) {
            const subclass = this.subclassInfo(targetCode);
            if (subclass) {
                return this.leadMinerTermFromSubclass(targetCode, subclass.description);
            }
        }
        const best = this.pickMostSpecific(resolved) ?? resolved[0];
        if (!best?.description) {
            return queryValue.trim();
        }
        return this.simplifyForLeadMiner(best.description);
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
    subclassInfo(code) {
        const normalized = this.normalizeCnaeCode(code);
        if (normalized.length !== 7) {
            return null;
        }
        const description = CNAE_SUBCLASS_DESCRIPTIONS[normalized];
        if (!description) {
            return {
                id: normalized,
                description: `Subclasse CNAE ${this.formatSubclassCode(normalized)}`,
            };
        }
        return {
            id: normalized,
            description,
        };
    }
    leadMinerTermFromSubclass(code, description) {
        if (code === '9602502') {
            return 'clínica de estética';
        }
        if (code === '9602501') {
            return 'salão de beleza';
        }
        const firstSegment = description.split(/\s+e\s+/i)[0]?.trim();
        return firstSegment ? this.simplifyForLeadMiner(firstSegment) : 'estética';
    }
    simplifyForLeadMiner(description) {
        const words = description
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => word.length > 3 && !/^outras?$/.test(word));
        return words.slice(0, 3).join(' ') || description.slice(0, 40);
    }
    pickMostSpecific(matches) {
        if (matches.length === 0) {
            return null;
        }
        return matches.reduce((best, item) => item.id.length > best.id.length ? item : best);
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
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }
};
exports.CnaeResolverService = CnaeResolverService;
exports.CnaeResolverService = CnaeResolverService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ibge_cnae_client_1.IbgeCnaeClient])
], CnaeResolverService);
//# sourceMappingURL=cnae-resolver.service.js.map