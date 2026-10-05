import { ConfigService } from '@nestjs/config';
import { CompanySettingsService } from '../../company-settings/company-settings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FetchMapsLeadsDto } from '../dto/fetch-maps-leads.dto';
import type { MappedPlace } from './maps-scraper.types';
export declare class MapsScraperService {
    private readonly configService;
    private readonly prisma;
    private readonly companySettings;
    private readonly logger;
    constructor(configService: ConfigService, prisma: PrismaService, companySettings: CompanySettingsService);
    fetchPlaces(dto: FetchMapsLeadsDto): Promise<MappedPlace[]>;
    lookupCompanyPlace(input: {
        name: string;
        legalName?: string | null;
        city: string;
        neighborhood?: string | null;
    }): Promise<MappedPlace | null>;
    fetchPlacesForCatalogEnrichment(dto: FetchMapsLeadsDto, maxResults: number): Promise<MappedPlace[]>;
    private resolveScraperCredentials;
    private fetchFromOutscraper;
    private fetchFromApify;
    private resolveApifyMaxResults;
    private extractApifyErrorMessage;
    private findLocalMappedPlaces;
    private mapOutscraperPlaces;
    private flattenPlaces;
    private asOptionalString;
}
