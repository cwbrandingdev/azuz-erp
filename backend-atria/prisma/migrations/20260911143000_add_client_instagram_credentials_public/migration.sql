-- Production uses the public schema (Fly DATABASE_URL / SUPABASE_DB_SCHEMA).
-- The previous migration only altered dev."Client", which made /clients and
-- Meta Insights fail in production with a missing instagramUserId column.
ALTER TABLE "public"."Client"
ADD COLUMN IF NOT EXISTS "instagramUserId" TEXT,
ADD COLUMN IF NOT EXISTS "metaAccessToken" TEXT;

ALTER TABLE "dev"."Client"
ADD COLUMN IF NOT EXISTS "instagramUserId" TEXT,
ADD COLUMN IF NOT EXISTS "metaAccessToken" TEXT;
