ALTER TABLE "lead_stages" ADD COLUMN "organization_id" TEXT;

ALTER TABLE "lead_stages" ADD CONSTRAINT "lead_stages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "lead_stages_organization_id_idx" ON "lead_stages"("organization_id");
CREATE INDEX "lead_stages_tenant_id_organization_id_order_idx" ON "lead_stages"("tenant_id", "organization_id", "order");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lead_stages_tenant_id_name_key'
  ) THEN
    ALTER TABLE "lead_stages" DROP CONSTRAINT "lead_stages_tenant_id_name_key";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = ANY (current_schemas(false))
      AND indexname = 'lead_stages_tenant_id_name_idx'
  ) THEN
    DROP INDEX "lead_stages_tenant_id_name_idx";
  END IF;
END $$;

CREATE UNIQUE INDEX "lead_stages_global_name_key"
  ON "lead_stages"("tenant_id", "name")
  WHERE "organization_id" IS NULL;

CREATE UNIQUE INDEX "lead_stages_organization_name_key"
  ON "lead_stages"("tenant_id", "organization_id", "name")
  WHERE "organization_id" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leads_stage_id_fkey'
  ) THEN
    ALTER TABLE "leads" DROP CONSTRAINT "leads_stage_id_fkey";
  END IF;
END $$;

ALTER TABLE "leads" ADD CONSTRAINT "leads_stage_id_fkey"
  FOREIGN KEY ("stage_id") REFERENCES "lead_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
