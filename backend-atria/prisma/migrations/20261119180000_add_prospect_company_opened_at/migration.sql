-- AlterTable
ALTER TABLE "prospect_companies" ADD COLUMN "opened_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "prospect_companies_uf_primary_cnae_opened_at_idx" ON "prospect_companies"("uf", "primary_cnae", "opened_at");
