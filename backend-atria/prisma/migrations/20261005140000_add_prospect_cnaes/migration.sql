CREATE TABLE "prospect_cnaes" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "description_normalized" TEXT NOT NULL,

    CONSTRAINT "prospect_cnaes_pkey" PRIMARY KEY ("code")
);

CREATE INDEX "prospect_cnaes_description_normalized_idx" ON "prospect_cnaes"("description_normalized");
