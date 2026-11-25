-- One-off Neon catalog index parity (safe to re-run).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "prospect_companies_opened_at_score_idx"
ON "prospect_companies" ("opened_at", "blended_score" DESC, "cnpj");

CREATE INDEX IF NOT EXISTS "prospect_companies_search_active_city_cnae_idx"
ON "prospect_companies" ("uf", "city_normalized", "primary_cnae", "blended_score" DESC, "cnpj")
WHERE "verdict" <> 'do_not_prioritize';

CREATE INDEX IF NOT EXISTS "prospect_companies_legal_name_trgm_idx"
ON "prospect_companies" USING GIN ("legal_name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "prospect_companies_trade_name_trgm_idx"
ON "prospect_companies" USING GIN ("trade_name" gin_trgm_ops);

ANALYZE prospect_companies;
ANALYZE prospect_cnaes;