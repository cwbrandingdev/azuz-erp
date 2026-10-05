import type { MappedPlace } from './maps-scraper.types';

const LEGAL_SUFFIXES = new Set([
  'ltda',
  'me',
  'epp',
  'eireli',
  'mei',
  'sa',
  's/a',
  'ss',
]);

const STOPWORDS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'the',
  'comercio',
  'comercial',
]);

const MATCH_THRESHOLD = 0.6;

export function normalizeCompanyName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function companyNameTokens(value: string): string[] {
  return normalizeCompanyName(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !LEGAL_SUFFIXES.has(token) && !STOPWORDS.has(token));
}

export function scoreCompanyNameMatch(left: string, right: string): number {
  const leftTokens = companyNameTokens(left);
  const rightTokens = companyNameTokens(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) {
      intersection += 1;
    }
  }

  if (intersection === 0) {
    return 0;
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  const jaccard = intersection / union;
  const containment = intersection / Math.min(leftSet.size, rightSet.size);
  return Math.max(jaccard, containment * 0.92);
}

export function bestNameScore(
  placeName: string,
  candidates: Array<string | null | undefined>,
): number {
  let best = 0;
  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    best = Math.max(best, scoreCompanyNameMatch(placeName, candidate));
  }
  return best;
}

export function pickBestPlaceForCompany(
  places: MappedPlace[],
  names: Array<string | null | undefined>,
): MappedPlace | null {
  let best: MappedPlace | null = null;
  let bestScore = 0;

  for (const place of places) {
    const score = bestNameScore(place.name, names);
    if (score > bestScore) {
      bestScore = score;
      best = place;
    }
  }

  if (!best || bestScore < MATCH_THRESHOLD) {
    return null;
  }

  return best;
}

export function matchPlacesToCompanies<T extends { id: string; name: string }>(
  companies: T[],
  places: MappedPlace[],
  extraNames: (company: T) => Array<string | null | undefined>,
): Array<{ company: T; place: MappedPlace; score: number }> {
  const pairs: Array<{ company: T; place: MappedPlace; score: number }> = [];

  for (const company of companies) {
    const names = [company.name, ...extraNames(company)];
    for (const place of places) {
      const score = bestNameScore(place.name, names);
      if (score >= MATCH_THRESHOLD) {
        pairs.push({ company, place, score });
      }
    }
  }

  pairs.sort((a, b) => b.score - a.score);

  const usedCompanies = new Set<string>();
  const usedPlaces = new Set<string>();
  const assigned: Array<{ company: T; place: MappedPlace; score: number }> = [];

  for (const pair of pairs) {
    const placeKey = pair.place.placeId ?? `name:${normalizeCompanyName(pair.place.name)}`;
    if (usedCompanies.has(pair.company.id) || usedPlaces.has(placeKey)) {
      continue;
    }
    usedCompanies.add(pair.company.id);
    usedPlaces.add(placeKey);
    assigned.push(pair);
  }

  return assigned;
}
