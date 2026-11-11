/** Max leads per Google Maps search (Apify prospecting / Lead Miner fallback). */
export const MAX_MAPS_SEARCH_RESULTS = 100;

/** Max leads per Lead Miner search — matches `SearchLeadsDto` @Max(100). */
export const MAX_LEADMINER_SEARCH_RESULTS = MAX_MAPS_SEARCH_RESULTS;

/** CNAE catalog search timeout when loading the full matching result set. */
export const CNAE_SEARCH_TIMEOUT_MS = 300_000;

/** Apify Google Maps scrape can take several minutes for 100 places with contacts. */
export const MAPS_FETCH_TIMEOUT_MS = 190_000;
