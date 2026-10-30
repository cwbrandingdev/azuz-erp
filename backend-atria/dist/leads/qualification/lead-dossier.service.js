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
var LeadDossierService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadDossierService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const company_lookup_service_1 = require("../company-lookup/application/company-lookup.service");
const text_normalize_1 = require("../company-lookup/domain/text-normalize");
const company_place_match_util_1 = require("../maps-scraper/company-place-match.util");
const maps_contact_merge_util_1 = require("../maps-scraper/maps-contact-merge.util");
const maps_scraper_service_1 = require("../maps-scraper/maps-scraper.service");
const instagram_apify_enricher_1 = require("./instagram-apify.enricher");
const registry_signals_util_1 = require("./registry-signals.util");
const website_cnpj_finder_1 = require("./website-cnpj.finder");
const FACADE_HIT_CACHE_MS = 30 * 24 * 60 * 60 * 1000;
const FACADE_MISS_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const FACADE_IMAGE_COUNT = 1;
let LeadDossierService = LeadDossierService_1 = class LeadDossierService {
    prisma;
    mapsScraper;
    companyLookup;
    instagramEnricher;
    logger = new common_1.Logger(LeadDossierService_1.name);
    constructor(prisma, mapsScraper, companyLookup, instagramEnricher) {
        this.prisma = prisma;
        this.mapsScraper = mapsScraper;
        this.companyLookup = companyLookup;
        this.instagramEnricher = instagramEnricher;
    }
    async collect(lead, apifyToken) {
        const [facade, registry, instagram] = await Promise.all([
            this.resolveFacade(lead, apifyToken),
            this.resolveRegistry(lead),
            this.resolveInstagram(lead, apifyToken),
        ]);
        let resolvedRegistry = registry;
        const discoveredWebsite = usableWebsite(facade.website);
        if (!resolvedRegistry.snapshot &&
            discoveredWebsite &&
            !lead.website?.trim()) {
            resolvedRegistry = await this.resolveRegistry({
                ...lead,
                website: discoveredWebsite,
            });
        }
        let instagramData = instagram;
        const discoveredInstagram = (0, maps_contact_merge_util_1.instagramUrlFromValue)(facade.instagram) ??
            (0, maps_contact_merge_util_1.instagramUrlFromValue)(discoveredWebsite);
        const instagramHandle = lead.instagram?.trim() || discoveredInstagram || undefined;
        if (!instagramData &&
            !lead.instagram?.trim() &&
            discoveredInstagram &&
            apifyToken) {
            instagramData = await this.fetchInstagram(discoveredInstagram, apifyToken);
        }
        const raw = this.mergeRawData(lead.rawData, {
            facade: facade.snapshot,
            registry: resolvedRegistry,
            instagram: instagramData,
        });
        const cnpj = resolvedRegistry.snapshot?.cnpj;
        return {
            rawData: raw,
            ...(cnpj && !lead.cnpj?.trim() ? { cnpj } : {}),
            ...(facade.latitude != null && lead.latitude == null
                ? { latitude: facade.latitude }
                : {}),
            ...(facade.longitude != null && lead.longitude == null
                ? { longitude: facade.longitude }
                : {}),
            ...(instagramHandle && !lead.instagram?.trim()
                ? { instagram: instagramHandle }
                : {}),
            ...(discoveredWebsite && !lead.website?.trim()
                ? { website: discoveredWebsite }
                : {}),
        };
    }
    async resolveFacade(lead, apifyToken) {
        const cached = readFacadeSnapshot(lead.rawData);
        if (cached && isFacadeFresh(cached)) {
            return {
                snapshot: cached,
                latitude: cached.latitude ?? undefined,
                longitude: cached.longitude ?? undefined,
            };
        }
        if (!apifyToken || !lead.city?.trim() || !lead.name.trim()) {
            return { snapshot: cached };
        }
        const result = await this.mapsScraper.lookupCompanyPlaceResult({
            name: lead.name,
            legalName: (0, registry_signals_util_1.readLegalNameFromRawData)(lead.rawData),
            city: lead.city,
            neighborhood: lead.neighborhood,
        }, { maxImages: FACADE_IMAGE_COUNT });
        if (result.failed) {
            return { snapshot: cached };
        }
        const place = result.place;
        const snapshot = {
            imageUrl: place?.imageUrl ?? null,
            latitude: place?.latitude ?? lead.latitude ?? null,
            longitude: place?.longitude ?? lead.longitude ?? null,
            fetchedAt: new Date().toISOString(),
            provider: 'apify',
        };
        return {
            snapshot,
            instagram: place?.instagram,
            website: place?.website,
            latitude: snapshot.latitude ?? undefined,
            longitude: snapshot.longitude ?? undefined,
        };
    }
    async resolveRegistry(lead) {
        const cached = (0, registry_signals_util_1.readCachedRegistrySnapshot)(lead.rawData);
        if (cached?.cnpj) {
            return { snapshot: cached, lookup: null };
        }
        const cachedLookup = (0, registry_signals_util_1.readRegistryLookupCache)(lead.rawData);
        if (cachedLookup) {
            return { snapshot: null, lookup: cachedLookup };
        }
        const existing = cnpjFromLead(lead);
        if (existing) {
            return this.lookupMatchedCnpj(existing, 'existing_cnpj');
        }
        const website = lead.website?.trim();
        if (website) {
            try {
                const found = await (0, website_cnpj_finder_1.findCnpjOnWebsite)(website);
                if (found.cnpj) {
                    return this.lookupMatchedCnpj(found.cnpj, 'website');
                }
                if (!found.fetched) {
                    const catalog = await this.matchCatalog(lead);
                    if (catalog)
                        return { snapshot: catalog, lookup: null };
                    return { snapshot: null, lookup: null };
                }
            }
            catch (error) {
                this.logger.warn(`Website CNPJ lookup failed: ${String(error)}`);
            }
        }
        try {
            const catalog = await this.matchCatalog(lead);
            if (catalog)
                return { snapshot: catalog, lookup: null };
        }
        catch (error) {
            this.logger.warn(`Catalog CNPJ match failed: ${String(error)}`);
            return {
                snapshot: null,
                lookup: { status: 'unavailable', fetchedAt: new Date().toISOString() },
            };
        }
        return {
            snapshot: null,
            lookup: { status: 'not_found', fetchedAt: new Date().toISOString() },
        };
    }
    async lookupMatchedCnpj(cnpj, matchMethod) {
        try {
            const record = await this.companyLookup.lookupRegistry(cnpj);
            if (!record) {
                return {
                    snapshot: null,
                    lookup: {
                        status: 'unavailable',
                        fetchedAt: new Date().toISOString(),
                    },
                };
            }
            return {
                snapshot: {
                    cnpj: record.cnpj,
                    capitalSocial: record.shareCapital ??
                        (0, registry_signals_util_1.parseShareCapital)(record.rawData.capital_social) ??
                        null,
                    legalName: record.legalName,
                    companySize: (0, registry_signals_util_1.readCompanySizeLabel)(record.rawData),
                    matchMethod,
                    fetchedAt: new Date().toISOString(),
                },
                lookup: null,
            };
        }
        catch (error) {
            this.logger.warn(`Registry lookup failed for ${cnpj}: ${String(error)}`);
            return {
                snapshot: null,
                lookup: { status: 'unavailable', fetchedAt: new Date().toISOString() },
            };
        }
    }
    async matchCatalog(lead) {
        const byPhone = await this.matchCatalogByPhone(lead);
        if (byPhone)
            return byPhone;
        return this.matchCatalogByName(lead);
    }
    async matchCatalogByPhone(lead) {
        const national = nationalPhone(lead.phone);
        if (!national)
            return null;
        const rows = await this.prisma.prospectCompany.findMany({
            where: { phone: { contains: national.slice(-8) } },
            take: 30,
        });
        const matches = rows.filter((row) => nationalPhone(row.phone) === national);
        if (matches.length === 0)
            return null;
        const city = lead.city ? (0, text_normalize_1.normalizeCatalogText)(lead.city) : '';
        const preferred = (city
            ? matches.find((row) => row.cityNormalized === city)
            : undefined) ?? matches[0];
        return snapshotFromCatalog(preferred, 'phone');
    }
    async matchCatalogByName(lead) {
        if (!lead.city?.trim() || !lead.name.trim())
            return null;
        const tokens = (0, company_place_match_util_1.companyNameTokens)(lead.name).sort((left, right) => right.length - left.length);
        const token = tokens.find((item) => item.length >= 4) ?? tokens[0];
        if (!token)
            return null;
        const rows = await this.prisma.prospectCompany.findMany({
            where: {
                cityNormalized: (0, text_normalize_1.normalizeCatalogText)(lead.city),
                OR: [
                    { tradeName: { contains: token, mode: 'insensitive' } },
                    { legalName: { contains: token, mode: 'insensitive' } },
                ],
            },
            take: 40,
        });
        let best = null;
        for (const row of rows) {
            const score = (0, company_place_match_util_1.bestNameScore)(lead.name, [row.tradeName, row.legalName]);
            if (score < company_place_match_util_1.COMPANY_NAME_MATCH_THRESHOLD)
                continue;
            if (!best || score > best.score)
                best = { row, score };
        }
        return best ? snapshotFromCatalog(best.row, 'name_city') : null;
    }
    async resolveInstagram(lead, apifyToken) {
        const cached = (0, instagram_apify_enricher_1.readFreshInstagramQualification)(lead.rawData);
        if (cached)
            return cached;
        const handle = lead.instagram?.trim();
        if (!handle || !apifyToken)
            return null;
        return this.fetchInstagram(handle, apifyToken);
    }
    async fetchInstagram(instagram, apifyToken) {
        try {
            return await this.instagramEnricher.fetchProfileSignals(instagram, apifyToken);
        }
        catch (error) {
            this.logger.warn(`Instagram dossier lookup failed: ${String(error)}`);
            return null;
        }
    }
    mergeRawData(rawData, input) {
        const base = rawData && typeof rawData === 'object' && !Array.isArray(rawData)
            ? { ...rawData }
            : {};
        if (input.facade) {
            base.facade = input.facade;
        }
        if (input.registry.snapshot) {
            base.registrySnapshot = input.registry.snapshot;
            base.cnpj = input.registry.snapshot.cnpj;
            delete base.registryLookup;
        }
        else if (input.registry.lookup) {
            base.registryLookup = input.registry.lookup;
        }
        if (input.instagram) {
            base.instagramQualification = input.instagram;
        }
        return base;
    }
};
exports.LeadDossierService = LeadDossierService;
exports.LeadDossierService = LeadDossierService = LeadDossierService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        maps_scraper_service_1.MapsScraperService,
        company_lookup_service_1.CompanyLookupService,
        instagram_apify_enricher_1.InstagramApifyEnricher])
], LeadDossierService);
function snapshotFromCatalog(row, matchMethod) {
    return {
        cnpj: row.cnpj,
        capitalSocial: row.shareCapital,
        legalName: row.legalName,
        companySize: (0, registry_signals_util_1.readCompanySizeLabel)({ companySize: row.companySize }),
        matchMethod,
        fetchedAt: new Date().toISOString(),
    };
}
function cnpjFromLead(lead) {
    const column = lead.cnpj?.replace(/\D/g, '') ?? '';
    if (column.length === 14)
        return column;
    return (0, registry_signals_util_1.extractCnpjFromLead)(lead);
}
function nationalPhone(value) {
    let digits = value?.replace(/\D/g, '') ?? '';
    if (digits.startsWith('55') && digits.length >= 12) {
        digits = digits.slice(2);
    }
    if (digits.length < 10 || digits.length > 11)
        return null;
    return digits;
}
function usableWebsite(value) {
    const trimmed = value?.trim();
    if (!trimmed || /instagram\.com/i.test(trimmed))
        return undefined;
    return trimmed;
}
function readFacadeSnapshot(rawData) {
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
        return null;
    }
    const facade = rawData.facade;
    if (!facade || typeof facade !== 'object' || Array.isArray(facade)) {
        return null;
    }
    const data = facade;
    if (!data.fetchedAt || data.provider !== 'apify')
        return null;
    return data;
}
function isFacadeFresh(snapshot) {
    const fetchedAt = Date.parse(snapshot.fetchedAt);
    if (!Number.isFinite(fetchedAt))
        return false;
    const maxAge = snapshot.imageUrl ? FACADE_HIT_CACHE_MS : FACADE_MISS_CACHE_MS;
    return Date.now() - fetchedAt < maxAge;
}
//# sourceMappingURL=lead-dossier.service.js.map