import type { DiscoveredCompanyCandidate } from '../domain/company-lookup.types';
import {
  type LeadMinerLeadRecord,
  parseLeadMinerWebsiteAndInstagram,
} from './lead-miner.client';

export function mapLeadMinerRecordsToCandidates(
  records: LeadMinerLeadRecord[],
  context: {
    city: string;
    neighborhood: string;
    category: string;
  },
): DiscoveredCompanyCandidate[] {
  const candidates: DiscoveredCompanyCandidate[] = [];

  for (const record of records) {
    const phone = record.phone?.trim();
    const name = record.title?.trim();
    if (!name) {
      continue;
    }

    const contact = parseLeadMinerWebsiteAndInstagram(
      record.website,
      record.instagram,
    );

    candidates.push({
      name,
      phone: phone || undefined,
      website: contact.website,
      instagram: contact.instagram,
      address: record.address?.trim() || undefined,
      city: context.city,
      neighborhood: context.neighborhood,
      category: record.category?.trim() || context.category,
      rating: record.rating,
      reviewsCount: record.reviews,
      source: 'leadminer',
      rawData: record as unknown as Record<string, unknown>,
    });
  }

  return candidates;
}
