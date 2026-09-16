import { ConfigService } from '@nestjs/config';
import type { GeocodingResult } from '../domain/company-lookup.types';
export declare class NominatimClient {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    geocodeAddress(address: string): Promise<GeocodingResult | null>;
    searchBusinesses(query: string, city: string, uf: string, limit: number): Promise<GeocodingResult[]>;
    search(query: string, limit: number): Promise<GeocodingResult[]>;
    extractCnpjFromExtratags(extratags?: Record<string, string>): string | undefined;
    private mapResult;
    private getUserAgent;
}
