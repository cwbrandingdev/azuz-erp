import type { FetchMapsLeadsDto } from '../dto/fetch-maps-leads.dto';
import type { MappedPlace } from './maps-scraper.types';
export declare function mapApifyPlaces(body: unknown, dto: FetchMapsLeadsDto): MappedPlace[];
export declare function buildApifyActorInput(dto: FetchMapsLeadsDto, maxResults: number): {
    searchStringsArray: string[];
    locationQuery: string;
    language: string;
    maxCrawledPlacesPerSearch: number;
    scrapePlaceDetailPage: boolean;
    scrapeContacts: boolean;
    scrapeSocialMediaProfiles: {
        instagrams: boolean;
        facebooks: boolean;
        youtubes: boolean;
        tiktoks: boolean;
        twitters: boolean;
    };
};
