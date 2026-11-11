import type { FetchMapsLeadsDto } from '../dto/fetch-maps-leads.dto';
import type { MappedPlace } from './maps-scraper.types';
export declare function mapSerpApiPlaces(body: unknown, dto: FetchMapsLeadsDto): MappedPlace[];
export declare function buildSerpApiMapsQuery(dto: FetchMapsLeadsDto): string;
