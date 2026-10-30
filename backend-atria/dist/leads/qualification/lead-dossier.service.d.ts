import { Lead, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyLookupService } from '../company-lookup/application/company-lookup.service';
import { MapsScraperService } from '../maps-scraper/maps-scraper.service';
import { InstagramApifyEnricher } from './instagram-apify.enricher';
export interface FacadeSnapshot {
    imageUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    fetchedAt: string;
    provider: 'apify';
}
export interface LeadDossierUpdate {
    rawData: Prisma.InputJsonValue;
    cnpj?: string;
    latitude?: number;
    longitude?: number;
    instagram?: string;
    website?: string;
}
export declare class LeadDossierService {
    private readonly prisma;
    private readonly mapsScraper;
    private readonly companyLookup;
    private readonly instagramEnricher;
    private readonly logger;
    constructor(prisma: PrismaService, mapsScraper: MapsScraperService, companyLookup: CompanyLookupService, instagramEnricher: InstagramApifyEnricher);
    collect(lead: Lead, apifyToken: string | null): Promise<LeadDossierUpdate>;
    private resolveFacade;
    private resolveRegistry;
    private lookupMatchedCnpj;
    private matchCatalog;
    private matchCatalogByPhone;
    private matchCatalogByName;
    private resolveInstagram;
    private fetchInstagram;
    private mergeRawData;
}
