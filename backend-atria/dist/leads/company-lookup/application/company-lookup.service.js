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
var CompanyLookupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyLookupService = void 0;
const common_1 = require("@nestjs/common");
const brasil_api_cnpj_client_1 = require("../infrastructure/brasil-api-cnpj.client");
const minha_receita_client_1 = require("../infrastructure/minha-receita.client");
const nominatim_client_1 = require("../infrastructure/nominatim.client");
let CompanyLookupService = CompanyLookupService_1 = class CompanyLookupService {
    brasilApiCnpjClient;
    minhaReceitaClient;
    nominatimClient;
    logger = new common_1.Logger(CompanyLookupService_1.name);
    constructor(brasilApiCnpjClient, minhaReceitaClient, nominatimClient) {
        this.brasilApiCnpjClient = brasilApiCnpjClient;
        this.minhaReceitaClient = minhaReceitaClient;
        this.nominatimClient = nominatimClient;
    }
    async lookup(cnpj) {
        const normalized = cnpj.replace(/\D/g, '');
        if (normalized.length !== 14) {
            return null;
        }
        try {
            const fromBrasilApi = await this.brasilApiCnpjClient.lookup(normalized);
            if (fromBrasilApi) {
                return this.withGeocoding(fromBrasilApi);
            }
        }
        catch (error) {
            this.logger.warn(`BrasilAPI lookup failed for ${normalized}: ${String(error)}`);
        }
        try {
            const fromMinhaReceita = await this.minhaReceitaClient.lookup(normalized);
            if (fromMinhaReceita) {
                return this.withGeocoding(fromMinhaReceita);
            }
        }
        catch (error) {
            this.logger.warn(`Minha Receita lookup failed for ${normalized}: ${String(error)}`);
        }
        return null;
    }
    async withGeocoding(record) {
        if (record.latitude !== undefined && record.longitude !== undefined) {
            return record;
        }
        const address = this.buildAddress(record);
        if (!address) {
            return record;
        }
        try {
            const geocoded = await this.nominatimClient.geocodeAddress(address);
            if (!geocoded) {
                return record;
            }
            return {
                ...record,
                latitude: geocoded.latitude,
                longitude: geocoded.longitude,
            };
        }
        catch (error) {
            this.logger.warn(`Geocoding failed for ${record.cnpj}: ${String(error)}`);
            return record;
        }
    }
    buildAddress(record) {
        const parts = [
            record.street,
            record.number,
            record.neighborhood,
            record.city,
            record.state,
            record.postalCode,
            'Brasil',
        ]
            .map((part) => part?.trim())
            .filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : undefined;
    }
};
exports.CompanyLookupService = CompanyLookupService;
exports.CompanyLookupService = CompanyLookupService = CompanyLookupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [brasil_api_cnpj_client_1.BrasilApiCnpjClient,
        minha_receita_client_1.MinhaReceitaClient,
        nominatim_client_1.NominatimClient])
], CompanyLookupService);
//# sourceMappingURL=company-lookup.service.js.map