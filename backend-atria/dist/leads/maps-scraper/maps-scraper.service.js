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
var MapsScraperService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapsScraperService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const company_settings_service_1 = require("../../company-settings/company-settings.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const apify_place_mapper_1 = require("./apify-place.mapper");
const OUTSCRAPER_TIMEOUT_MS = 180_000;
const OUTSCRAPER_LIMIT = 25;
const APIFY_TIMEOUT_MS = 180_000;
const APIFY_DEFAULT_MAX_RESULTS = 25;
const APIFY_MAX_RESULTS_LIMIT = 120;
let MapsScraperService = MapsScraperService_1 = class MapsScraperService {
    configService;
    prisma;
    companySettings;
    logger = new common_1.Logger(MapsScraperService_1.name);
    constructor(configService, prisma, companySettings) {
        this.configService = configService;
        this.prisma = prisma;
        this.companySettings = companySettings;
    }
    async fetchPlaces(dto) {
        const credentials = await this.resolveScraperCredentials();
        if (credentials.apifyApiToken) {
            return this.fetchFromApify(dto, credentials.apifyApiToken);
        }
        const outscraperKey = this.configService.get('OUTSCRAPER_API_KEY');
        if (outscraperKey?.trim()) {
            return this.fetchFromOutscraper(dto, outscraperKey.trim());
        }
        return this.findLocalMappedPlaces(dto);
    }
    async resolveScraperCredentials() {
        let tenantApifyApiToken = null;
        try {
            const credentials = await this.companySettings.getScraperCredentialsForCurrentTenant();
            tenantApifyApiToken = credentials.apifyApiToken;
        }
        catch { }
        return {
            apifyApiToken: tenantApifyApiToken?.trim() ||
                this.configService.get('APIFY_API_TOKEN')?.trim() ||
                null,
        };
    }
    async fetchFromOutscraper(dto, apiKey) {
        const query = `${dto.category}, ${dto.neighborhood}, ${dto.city}`;
        const params = new URLSearchParams({
            query,
            limit: String(OUTSCRAPER_LIMIT),
            async: 'false',
            language: 'pt',
            region: 'br',
        });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), OUTSCRAPER_TIMEOUT_MS);
        try {
            const response = await fetch(`https://api.outscraper.com/google-maps-search?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'X-API-KEY': apiKey,
                    Accept: 'application/json',
                },
                signal: controller.signal,
            });
            const bodyText = await response.text();
            let body;
            try {
                body = bodyText ? JSON.parse(bodyText) : null;
            }
            catch {
                body = bodyText;
            }
            if (!response.ok) {
                this.logger.warn(`Outscraper error ${response.status}: ${bodyText.slice(0, 500)}`);
                throw new common_1.BadGatewayException('Falha ao buscar lugares no Outscraper. Tente novamente.');
            }
            return this.mapOutscraperPlaces(body, dto);
        }
        catch (error) {
            if (error instanceof common_1.BadGatewayException)
                throw error;
            if (error instanceof Error && error.name === 'AbortError') {
                throw new common_1.RequestTimeoutException('A busca no Outscraper excedeu o tempo limite. Tente novamente.');
            }
            this.logger.warn(`Outscraper request failed: ${String(error)}`);
            throw new common_1.BadGatewayException('Não foi possível conectar ao Outscraper.');
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async fetchFromApify(dto, token) {
        const actorId = this.configService.get('APIFY_GOOGLE_MAPS_ACTOR') ??
            'compass~crawler-google-places';
        const payload = this.buildApifyActorInput(dto);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), APIFY_TIMEOUT_MS);
        try {
            const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            const bodyText = await response.text();
            let body;
            try {
                body = bodyText ? JSON.parse(bodyText) : null;
            }
            catch {
                body = bodyText;
            }
            if (!response.ok) {
                this.logger.warn(`Apify error ${response.status}: ${bodyText.slice(0, 500)}`);
                throw new common_1.BadGatewayException(this.extractApifyErrorMessage(body) ??
                    'Falha ao buscar lugares no Apify. Tente novamente.');
            }
            return (0, apify_place_mapper_1.mapApifyPlaces)(body, dto);
        }
        catch (error) {
            if (error instanceof common_1.BadGatewayException)
                throw error;
            if (error instanceof Error && error.name === 'AbortError') {
                throw new common_1.RequestTimeoutException('A busca no Apify excedeu o tempo limite. Tente novamente.');
            }
            this.logger.warn(`Apify request failed: ${String(error)}`);
            throw new common_1.BadGatewayException('Não foi possível conectar ao Apify.');
        }
        finally {
            clearTimeout(timeout);
        }
    }
    buildApifyActorInput(dto) {
        return (0, apify_place_mapper_1.buildApifyActorInput)(dto, this.resolveApifyMaxResults());
    }
    resolveApifyMaxResults() {
        const configured = Number(this.configService.get('APIFY_MAX_RESULTS'));
        if (!Number.isFinite(configured) || configured <= 0) {
            return APIFY_DEFAULT_MAX_RESULTS;
        }
        return Math.min(APIFY_MAX_RESULTS_LIMIT, Math.max(1, Math.round(configured)));
    }
    extractApifyErrorMessage(body) {
        if (typeof body !== 'object' || body === null) {
            return null;
        }
        const record = body;
        const error = record.error;
        if (typeof error === 'object' && error !== null) {
            const message = error.message;
            if (typeof message === 'string' && message.trim()) {
                return message.trim();
            }
        }
        const message = record.message;
        if (typeof message === 'string' && message.trim()) {
            return message.trim();
        }
        return null;
    }
    async findLocalMappedPlaces(dto) {
        const leads = await this.prisma.lead.findMany({
            where: {
                deletedAt: null,
                AND: [
                    {
                        OR: [
                            { city: { contains: dto.city, mode: 'insensitive' } },
                            {
                                neighborhood: {
                                    contains: dto.neighborhood,
                                    mode: 'insensitive',
                                },
                            },
                            { category: { contains: dto.category, mode: 'insensitive' } },
                        ],
                    },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return leads.map((lead) => ({
            name: lead.name,
            phone: lead.phone ?? undefined,
            email: lead.email ?? undefined,
            website: lead.website ?? undefined,
            address: lead.address ?? undefined,
            city: lead.city ?? dto.city,
            neighborhood: lead.neighborhood ?? dto.neighborhood,
            category: lead.category ?? dto.category,
            placeId: lead.placeId ?? undefined,
            rating: lead.rating ?? undefined,
            reviewsCount: lead.reviewsCount ?? undefined,
            latitude: lead.latitude ?? undefined,
            longitude: lead.longitude ?? undefined,
            source: 'local',
            rawData: lead.rawData ?? {
                id: lead.id,
                source: 'local',
            },
        }));
    }
    mapOutscraperPlaces(body, dto) {
        const places = this.flattenPlaces(body);
        const mapped = [];
        for (const place of places) {
            const name = typeof place.name === 'string' && place.name.trim()
                ? place.name.trim()
                : null;
            if (!name)
                continue;
            mapped.push({
                name,
                phone: this.asOptionalString(place.phone),
                email: this.asOptionalString(place.email),
                website: this.asOptionalString(place.site),
                address: this.asOptionalString(place.full_address ?? place.address),
                city: this.asOptionalString(place.city) ?? dto.city,
                neighborhood: this.asOptionalString(place.borough ?? place.neighborhood) ??
                    dto.neighborhood,
                category: this.asOptionalString(place.category ?? place.type) ?? dto.category,
                placeId: this.asOptionalString(place.place_id),
                rating: typeof place.rating === 'number' ? place.rating : undefined,
                reviewsCount: typeof place.reviews === 'number' ? place.reviews : undefined,
                latitude: typeof place.latitude === 'number' ? place.latitude : undefined,
                longitude: typeof place.longitude === 'number' ? place.longitude : undefined,
                source: 'outscraper',
                rawData: place,
            });
        }
        return mapped;
    }
    flattenPlaces(body) {
        if (Array.isArray(body)) {
            if (body.length > 0 && Array.isArray(body[0])) {
                return body.flat();
            }
            return body;
        }
        if (typeof body !== 'object' || body === null) {
            return [];
        }
        const record = body;
        const data = record.data;
        if (Array.isArray(data)) {
            if (data.length > 0 && Array.isArray(data[0])) {
                return data.flat();
            }
            return data;
        }
        return [];
    }
    asOptionalString(value) {
        if (typeof value !== 'string')
            return undefined;
        const trimmed = value.trim();
        return trimmed || undefined;
    }
};
exports.MapsScraperService = MapsScraperService;
exports.MapsScraperService = MapsScraperService = MapsScraperService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        company_settings_service_1.CompanySettingsService])
], MapsScraperService);
//# sourceMappingURL=maps-scraper.service.js.map