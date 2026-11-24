-- Covering indexes for CNAE catalog search / pagination
-- pg_trgm may already live in another schema (Supabase `extensions`, local `dev`).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
SET LOCAL search_path TO public, extensions, dev;

CREATE INDEX IF NOT EXISTS "prospect_companies_search_city_cnae_score_idx"
ON "prospect_companies" ("uf", "city_normalized", "primary_cnae", "blended_score" DESC, "cnpj");

CREATE INDEX IF NOT EXISTS "prospect_companies_search_cnae_opened_score_idx"
ON "prospect_companies" ("uf", "primary_cnae", "opened_at", "blended_score" DESC);

CREATE INDEX IF NOT EXISTS "prospect_companies_search_city_neighborhood_idx"
ON "prospect_companies" ("uf", "city_normalized", "neighborhood_normalized");

CREATE INDEX IF NOT EXISTS "prospect_companies_search_city_opened_idx"
ON "prospect_companies" ("uf", "city_normalized", "opened_at");

-- Partial index: skip do_not_prioritize rows (matches default search filter)
CREATE INDEX IF NOT EXISTS "prospect_companies_search_active_city_cnae_idx"
ON "prospect_companies" ("uf", "city_normalized", "primary_cnae", "blended_score" DESC, "cnpj")
WHERE "verdict" <> 'do_not_prioritize';

-- Array containment for secondary CNAEs (`secondaryCnaes: { has: code }`)
CREATE INDEX IF NOT EXISTS "prospect_companies_secondary_cnaes_gin_idx"
ON "prospect_companies" USING GIN ("secondary_cnaes");

-- Trigram indexes for case-insensitive name contains filters
CREATE INDEX IF NOT EXISTS "prospect_companies_legal_name_trgm_idx"
ON "prospect_companies" USING GIN ("legal_name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "prospect_companies_trade_name_trgm_idx"
ON "prospect_companies" USING GIN ("trade_name" gin_trgm_ops);

-- Lead hydrate lookups by placeId within a tenant
CREATE INDEX IF NOT EXISTS "leads_company_place_deleted_idx"
ON "leads" ("companyId", "place_id", "deleted_at");
