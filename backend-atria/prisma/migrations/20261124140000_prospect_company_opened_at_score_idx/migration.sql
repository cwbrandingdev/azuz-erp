-- Opening-date-only catalog search: filter by opened_at, order by score
CREATE INDEX IF NOT EXISTS "prospect_companies_opened_at_score_idx"
ON "prospect_companies" ("opened_at", "blended_score" DESC, "cnpj");
