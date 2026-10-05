CREATE TYPE "ProspectFitVerdict" AS ENUM ('high', 'medium', 'low', 'do_not_prioritize');

CREATE TABLE "prospect_companies" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "street" TEXT,
    "number" TEXT,
    "neighborhood" TEXT,
    "neighborhood_normalized" TEXT,
    "city" TEXT NOT NULL,
    "city_normalized" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "postal_code" TEXT,
    "municipality_code" TEXT,
    "address" TEXT,
    "primary_cnae" TEXT NOT NULL,
    "primary_cnae_description" TEXT,
    "secondary_cnaes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "share_capital" DOUBLE PRECISION,
    "company_size" TEXT,
    "is_mei" BOOLEAN NOT NULL DEFAULT false,
    "is_simples" BOOLEAN NOT NULL DEFAULT false,
    "registry_score" INTEGER NOT NULL,
    "commercial_score" INTEGER NOT NULL,
    "blended_score" INTEGER NOT NULL,
    "verdict" "ProspectFitVerdict" NOT NULL,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'receita',
    "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospect_companies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prospect_companies_cnpj_key" ON "prospect_companies"("cnpj");

CREATE INDEX "prospect_companies_uf_city_normalized_primary_cnae_idx" ON "prospect_companies"("uf", "city_normalized", "primary_cnae");

CREATE INDEX "prospect_companies_uf_primary_cnae_blended_score_idx" ON "prospect_companies"("uf", "primary_cnae", "blended_score" DESC);

CREATE INDEX "prospect_companies_qualified_blended_score_idx" ON "prospect_companies"("qualified", "blended_score" DESC);
