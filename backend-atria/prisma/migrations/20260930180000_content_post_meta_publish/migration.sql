DO $$
BEGIN
  CREATE TYPE "MetaPublishStatus" AS ENUM (
    'NOT_SCHEDULED',
    'PENDING',
    'SCHEDULED',
    'PUBLISHED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ContentPost" ADD COLUMN IF NOT EXISTS "metaIgContainerId" TEXT;
ALTER TABLE "ContentPost" ADD COLUMN IF NOT EXISTS "metaIgMediaId" TEXT;

DO $$
BEGIN
  ALTER TABLE "ContentPost"
    ADD COLUMN "metaPublishStatus" "MetaPublishStatus" NOT NULL DEFAULT 'NOT_SCHEDULED';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

ALTER TABLE "ContentPost" ADD COLUMN IF NOT EXISTS "metaPublishError" TEXT;
ALTER TABLE "ContentPost" ADD COLUMN IF NOT EXISTS "metaScheduledAt" TIMESTAMP(3);
ALTER TABLE "ContentPost" ADD COLUMN IF NOT EXISTS "metaIgPermalink" TEXT;
