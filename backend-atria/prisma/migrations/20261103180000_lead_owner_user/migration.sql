ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "owner_user_id" TEXT;

CREATE INDEX IF NOT EXISTS "leads_owner_user_id_idx" ON "leads"("owner_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_owner_user_id_fkey'
  ) THEN
    ALTER TABLE "leads"
    ADD CONSTRAINT "leads_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "leads"
SET "owner_user_id" = (
  SELECT id FROM "User" WHERE email = 'mariah@cwbranding.com.br'
)
WHERE kanban_tracked = true
  AND deleted_at IS NULL
  AND owner_user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM "User" WHERE email = 'mariah@cwbranding.com.br'
  );
