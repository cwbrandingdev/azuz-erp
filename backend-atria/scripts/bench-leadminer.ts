import { ConfigService } from '@nestjs/config';
import type { DiscoveredCompanyCandidate } from '../src/leads/company-lookup/domain/company-lookup.types';
import { LeadMinerClient } from '../src/leads/company-lookup/infrastructure/lead-miner.client';
import { mapLeadMinerRecordsToCandidates } from '../src/leads/company-lookup/infrastructure/lead-miner.mapper';
import { NominatimClient } from '../src/leads/company-lookup/infrastructure/nominatim.client';

interface BenchmarkResult {
  label: string;
  apiCount: number;
  mappedCount: number;
  scrapeMs: number;
  geocodeMs: number;
  totalMs: number;
  withCoords: number;
}

const SEARCHES = [
  {
    label: 'restaurante / Curitiba / Centro',
    payload: {
      category: 'restaurante',
      city: 'Curitiba',
      neighborhood: 'Centro',
      max_results: 25,
    },
  },
  {
    label: 'pet shop / São Paulo / Pinheiros',
    payload: {
      category: 'pet shop',
      city: 'São Paulo',
      neighborhood: 'Pinheiros',
      max_results: 25,
    },
  },
  {
    label: 'dentista / Rio de Janeiro / Copacabana',
    payload: {
      category: 'dentista',
      city: 'Rio de Janeiro',
      neighborhood: 'Copacabana',
      max_results: 25,
    },
  },
];

const config = new ConfigService({
  LEADMINER_API: process.env.LEADMINER_API ?? 'https://lead-miner.fly.dev',
});
const leadMiner = new LeadMinerClient(config);
const nominatim = new NominatimClient(config);

async function geocodeCandidates(records: DiscoveredCompanyCandidate[]) {
  const enriched: DiscoveredCompanyCandidate[] = [];
  for (const candidate of records) {
    const address = candidate.address?.trim();
    if (!address) {
      enriched.push(candidate);
      continue;
    }

    await new Promise((resolve) => setTimeout(resolve, 1100));
    const geocoded = await nominatim.geocodeAddress(
      address.includes('Brasil') ? address : `${address}, Brasil`,
    );

    enriched.push(
      geocoded
        ? {
            ...candidate,
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
          }
        : candidate,
    );
  }

  return enriched;
}

async function main() {
  const scrapeOnly = process.argv.includes('--scrape-only');
  const results: BenchmarkResult[] = [];

  for (const search of SEARCHES) {
    const scrapeStarted = performance.now();
    const records = await leadMiner.searchAndWait(search.payload);
    const scrapeMs = Math.round(performance.now() - scrapeStarted);

    const mapped = mapLeadMinerRecordsToCandidates(records, {
      city: search.payload.city,
      neighborhood: search.payload.neighborhood,
      category: search.payload.category,
    });

    let geocodeMs = 0;
    let enriched = mapped;
    if (!scrapeOnly) {
      const geocodeStarted = performance.now();
      enriched = await geocodeCandidates(mapped);
      geocodeMs = Math.round(performance.now() - geocodeStarted);
    }

    const withCoords = enriched.filter(
      (item) =>
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number',
    ).length;

    results.push({
      label: search.label,
      apiCount: records.length,
      mappedCount: mapped.length,
      scrapeMs,
      geocodeMs,
      totalMs: scrapeMs + geocodeMs,
      withCoords,
    });

    console.log(`=== ${search.label} ===`);
    console.log(
      `Backend Lead Miner scrape: ${scrapeMs}ms · API ${records.length} · mapped ${mapped.length}`,
    );
    console.log(
      `Backend geocoding: ${geocodeMs}ms · coords ${withCoords}/${mapped.length}`,
    );
    console.log(`Backend total (scrape + geocode): ${scrapeMs + geocodeMs}ms`);
    console.log('');
  }

  const avgScrape = Math.round(
    results.reduce((sum, item) => sum + item.scrapeMs, 0) / results.length,
  );
  const avgGeocode = Math.round(
    results.reduce((sum, item) => sum + item.geocodeMs, 0) / results.length,
  );
  const avgTotal = Math.round(
    results.reduce((sum, item) => sum + item.totalMs, 0) / results.length,
  );

  console.log('=== BACKEND SUMMARY ===');
  console.log(`Avg scrape: ${avgScrape}ms`);
  console.log(`Avg geocoding: ${avgGeocode}ms`);
  console.log(`Avg total: ${avgTotal}ms`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
