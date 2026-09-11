-- Run in Supabase SQL Editor on the PUBLIC schema (production)
-- Fixes 500 errors on /clients and /instagram-insights after Instagram credentials feature

ALTER TABLE "public"."Client"
ADD COLUMN IF NOT EXISTS "instagramUserId" TEXT,
ADD COLUMN IF NOT EXISTS "metaAccessToken" TEXT;
