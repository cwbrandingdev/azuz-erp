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
var CompanyDiscoveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyDiscoveryService = void 0;
const common_1 = require("@nestjs/common");
const cnae_resolver_service_1 = require("./cnae-resolver.service");
const company_lookup_service_1 = require("./company-lookup.service");
const nominatim_client_1 = require("../infrastructure/nominatim.client");
const brazil_states_1 = require("../domain/brazil-states");
const DEFAULT_MAX_RESULTS = 20;
const NOMINATIM_RESULTS_PER_TERM = 15;
const ACTIVE_STATUS_CODES = new Set(['2', 'ATIVA', 'ATIVO']);
let CompanyDiscoveryService = CompanyDiscoveryService_1 = class CompanyDiscoveryService {
    cnaeResolver;
    companyLookup;
    nominatimClient;
    logger = new common_1.Logger(CompanyDiscoveryService_1.name);
    constructor(cnaeResolver, companyLookup, nominatimClient) {
        this.cnaeResolver = cnaeResolver;
        this.companyLookup = companyLookup;
        this.nominatimClient = nominatimClient;
    }
    async discover(params) {
        const maxResults = params.maxResults ?? DEFAULT_MAX_RESULTS;
        const cnaeClasses = await this.cnaeResolver.resolve(params.queryType, params.queryValue);
        const cnaeCodes = cnaeClasses.map((item) => item.id);
        const searchTerms = this.buildSearchTerms(params, cnaeClasses);
        const explicitCnpjs = this.extractCnpjs(params.queryValue);
        const discovered = new Map();
        for (const cnpj of explicitCnpjs) {
            const enriched = await this.enrichCnpj(cnpj, cnaeCodes, params);
            if (enriched) {
                discovered.set(this.buildKey(enriched), enriched);
            }
        }
        for (const term of searchTerms) {
            if (discovered.size >= maxResults) {
                break;
            }
            try {
                const places = await this.nominatimClient.searchBusinesses(term, params.city, params.uf, Math.min(NOMINATIM_RESULTS_PER_TERM, maxResults));
                for (const place of places) {
                    if (discovered.size >= maxResults) {
                        break;
                    }
                    const cnpj = this.nominatimClient.extractCnpjFromExtratags(place.extratags);
                    if (cnpj) {
                        const enriched = await this.enrichCnpj(cnpj, cnaeCodes, params);
                        if (enriched) {
                            discovered.set(this.buildKey(enriched), enriched);
                        }
                        continue;
                    }
                    const candidate = {
                        name: place.displayName.split(',')[0]?.trim() || place.displayName,
                        phone: this.extractContactFromPlace(place, 'phone'),
                        website: this.extractContactFromPlace(place, 'website'),
                        address: place.displayName,
                        city: params.city,
                        category: term,
                        latitude: place.latitude,
                        longitude: place.longitude,
                        source: 'nominatim',
                        rawData: { ...place },
                    };
                    if (this.matchesLocation(candidate, params)) {
                        discovered.set(this.buildKey(candidate), candidate);
                    }
                }
            }
            catch (error) {
                this.logger.warn(`Nominatim discovery failed for "${term}": ${String(error)}`);
            }
        }
        return Array.from(discovered.values()).slice(0, maxResults);
    }
    async enrichCnpj(cnpj, cnaeCodes, params) {
        const record = await this.companyLookup.lookup(cnpj);
        if (!record) {
            return null;
        }
        if (!this.isActive(record.registrationStatus)) {
            return null;
        }
        if (!this.matchesCnae(record, cnaeCodes)) {
            return null;
        }
        if (!this.matchesCompanyLocation(record, params.city, params.uf)) {
            return null;
        }
        const address = [
            record.street,
            record.number,
            record.neighborhood,
            record.city,
            record.state,
            record.postalCode,
        ]
            .filter(Boolean)
            .join(', ');
        return {
            cnpj: record.cnpj,
            name: record.tradeName || record.legalName,
            phone: record.phone,
            email: record.email,
            address: address || undefined,
            city: record.city,
            neighborhood: record.neighborhood,
            category: record.primaryCnaeDescription,
            latitude: record.latitude,
            longitude: record.longitude,
            source: 'brasilapi',
            rawData: record.rawData,
        };
    }
    buildSearchTerms(params, cnaeClasses) {
        const terms = new Set();
        const queryValue = params.queryValue.trim();
        const city = params.city.trim();
        if (params.queryType === 'NICHO') {
            terms.add(queryValue);
            terms.add(`${queryValue} ${city}`);
            terms.add(`empresa ${queryValue} ${city}`);
        }
        else {
            terms.add(`${queryValue} ${city}`);
        }
        for (const cnae of cnaeClasses) {
            const simplified = this.simplifyCnaeDescription(cnae.description);
            terms.add(simplified);
            terms.add(`${simplified} ${city}`);
            if (params.queryType === 'NICHO') {
                terms.add(`${queryValue} ${simplified} ${city}`);
            }
        }
        if (terms.size === 0) {
            terms.add(`empresa ${city}`);
        }
        return Array.from(terms).filter(Boolean);
    }
    simplifyCnaeDescription(description) {
        const words = description
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => word.length > 3);
        return words.slice(0, 4).join(' ');
    }
    extractCnpjs(value) {
        const matches = value.match(/\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) ?? [];
        return Array.from(new Set(matches.map((item) => item.replace(/\D/g, '')).filter((item) => item.length === 14)));
    }
    matchesCnae(record, cnaeCodes) {
        if (cnaeCodes.length === 0) {
            return true;
        }
        const companyCodes = [
            record.primaryCnaeCode,
            ...record.secondaryCnaeCodes,
        ].filter(Boolean);
        return cnaeCodes.some((target) => companyCodes.some((code) => code === target ||
            code.startsWith(target) ||
            target.startsWith(code)));
    }
    isActive(status) {
        if (!status) {
            return true;
        }
        const normalized = status.trim().toUpperCase();
        return ACTIVE_STATUS_CODES.has(normalized) || normalized.includes('ATIV');
    }
    matchesCompanyLocation(record, city, uf) {
        const normalizedCity = this.normalizeText(city);
        const normalizedUf = uf.trim().toUpperCase();
        const recordCity = this.normalizeText(record.city ?? '');
        const recordUf = record.state?.trim().toUpperCase() ?? '';
        if (recordUf && recordUf !== normalizedUf) {
            return false;
        }
        if (!recordCity) {
            return true;
        }
        return recordCity.includes(normalizedCity) || normalizedCity.includes(recordCity);
    }
    matchesLocation(candidate, params) {
        const haystack = this.normalizeText([candidate.address, candidate.city, candidate.name].filter(Boolean).join(' '));
        const city = this.normalizeText(params.city);
        const uf = params.uf.trim().toUpperCase();
        const stateName = brazil_states_1.BRAZIL_STATE_NAMES[uf] ?? '';
        const matchesCity = haystack.includes(city) ||
            this.normalizeText(candidate.city ?? '').includes(city) ||
            city.includes(this.normalizeText(candidate.city ?? ''));
        if (!matchesCity) {
            return false;
        }
        if (!stateName) {
            return true;
        }
        return haystack.includes(stateName);
    }
    buildKey(candidate) {
        return candidate.cnpj ?? `${candidate.name}:${candidate.address ?? ''}`;
    }
    normalizeText(value) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }
    extractContactFromPlace(place, field) {
        const extratags = place.extratags ?? {};
        const keys = field === 'phone'
            ? ['phone', 'contact:phone', 'contact:mobile']
            : ['website', 'contact:website', 'url'];
        for (const key of keys) {
            const value = extratags[key]?.trim();
            if (value) {
                return value;
            }
        }
        return undefined;
    }
};
exports.CompanyDiscoveryService = CompanyDiscoveryService;
exports.CompanyDiscoveryService = CompanyDiscoveryService = CompanyDiscoveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cnae_resolver_service_1.CnaeResolverService,
        company_lookup_service_1.CompanyLookupService,
        nominatim_client_1.NominatimClient])
], CompanyDiscoveryService);
//# sourceMappingURL=company-discovery.service.js.map