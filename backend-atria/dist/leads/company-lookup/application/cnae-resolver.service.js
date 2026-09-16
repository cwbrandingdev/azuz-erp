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
            const codeMatch = normalizedCode.length > 0 &&
                (item.id === normalizedCode || item.id.startsWith(normalizedCode));
            const descriptionMatch = this.normalizeText(item.description).includes(normalizedText);
            return codeMatch || descriptionMatch;
        });
        return matches.slice(0, limit).map((item) => ({
            id: item.id,
            description: item.description,
        }));
    }
    async resolve(queryType, queryValue) {
        const normalizedQuery = queryValue.trim();
        const classes = await this.ibgeCnaeClient.listClasses();
        if (queryType === 'CNAE') {
            const targetCode = this.normalizeCnaeCode(normalizedQuery);
            const exactMatches = classes.filter((item) => item.id === targetCode ||
                item.id.startsWith(targetCode) ||
                targetCode.startsWith(item.id));
            if (exactMatches.length > 0) {
                return exactMatches;
            }
            return [
                {
                    id: targetCode,
                    description: `CNAE ${targetCode}`,
                },
            ];
        }
        const normalizedNiche = this.normalizeText(normalizedQuery);
        const matches = classes.filter((item) => this.normalizeText(item.description).includes(normalizedNiche));
        return matches.slice(0, 5);
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