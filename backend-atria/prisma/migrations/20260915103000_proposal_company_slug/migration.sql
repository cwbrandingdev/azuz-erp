-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN "companyName" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "slug" TEXT;

-- Backfill existing rows
UPDATE "Proposal" SET "companyName" = COALESCE("title", 'Proposta') WHERE "companyName" IS NULL;
UPDATE "Proposal" SET "slug" = "id" WHERE "slug" IS NULL;

-- Enforce constraints
ALTER TABLE "Proposal" ALTER COLUMN "companyName" SET NOT NULL;
ALTER TABLE "Proposal" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_slug_key" ON "Proposal"("slug");
