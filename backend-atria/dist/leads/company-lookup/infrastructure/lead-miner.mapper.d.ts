import type { DiscoveredCompanyCandidate } from '../domain/company-lookup.types';
import { type LeadMinerLeadRecord } from './lead-miner.client';
export declare function mapLeadMinerRecordsToCandidates(records: LeadMinerLeadRecord[], context: {
    city: string;
    neighborhood: string;
    category: string;
}): DiscoveredCompanyCandidate[];
