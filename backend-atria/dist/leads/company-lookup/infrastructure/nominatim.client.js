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
var NominatimClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NominatimClient = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const company_lookup_errors_1 = require("../domain/company-lookup.errors");
const BASE_URL = 'https://nominatim.openstreetmap.org';
const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT = 'atria-erp/1.0 (contact@atria.local)';
let NominatimClient = NominatimClient_1 = class NominatimClient {
    configService;
    logger = new common_1.Logger(NominatimClient_1.name);
    constructor(configService) {
        this.configService = configService;
    }
    async geocodeAddress(address) {
        const results = await this.search(address, 1);
        return results[0] ?? null;
    }
    async searchBusinesses(query, city, uf, limit) {
        const composedQuery = `${query}, ${city}, ${uf}, Brasil`;
        return this.search(composedQuery, limit);
    }
    async search(query, limit) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const params = new URLSearchParams({
                q: query,
                format: 'json',
                addressdetails: '1',
                limit: String(Math.min(Math.max(limit, 1), 50)),
            });
            const response = await fetch(`${BASE_URL}/search?${params.toString()}`, {
                signal: controller.signal,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': this.getUserAgent(),
                },
            });
            if (!response.ok) {
                const body = await response.text();
                throw new company_lookup_errors_1.GeocodingError(`Nominatim search failed with status ${response.status}: ${body.slice(0, 200)}`);
            }
            const data = (await response.json());
            return data
                .map((item) => this.mapResult(item))
                .filter((item) => item !== null);
        }
        catch (error) {
            if (error instanceof company_lookup_errors_1.GeocodingError) {
                throw error;
            }
            this.logger.warn(`Nominatim search failed: ${String(error)}`);
            throw new company_lookup_errors_1.GeocodingError('Nominatim search failed', error);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    extractCnpjFromExtratags(extratags) {
        if (!extratags) {
            return undefined;
        }
        const candidates = [
            extratags.cnpj,
            extratags['ref:vatin'],
            extratags.vatin,
            extratags['tax:CNPJ'],
        ];
        for (const candidate of candidates) {
            const normalized = candidate?.replace(/\D/g, '');
            if (normalized && normalized.length === 14) {
                return normalized;
            }
        }
        return undefined;
    }
    mapResult(item) {
        const latitude = Number(item.lat);
        const longitude = Number(item.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }
        return {
            latitude,
            longitude,
            displayName: item.display_name?.trim() || item.name?.trim() || '',
            extratags: item.extratags,
            address: item.address,
        };
    }
    getUserAgent() {
        return (this.configService.get('NOMINATIM_USER_AGENT')?.trim() ||
            DEFAULT_USER_AGENT);
    }
};
exports.NominatimClient = NominatimClient;
exports.NominatimClient = NominatimClient = NominatimClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], NominatimClient);
//# sourceMappingURL=nominatim.client.js.map