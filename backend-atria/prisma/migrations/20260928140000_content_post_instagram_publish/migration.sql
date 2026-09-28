-- CreateEnum
CREATE TYPE "ContentPostPublishStatus" AS ENUM ('NONE', 'QUEUED', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- AlterTable
ALTER TABLE "ContentPost" ADD COLUMN     "publishToInstagram" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishStatus" "ContentPostPublishStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "instagramMediaId" TEXT,
ADD COLUMN     "instagramPermalink" TEXT,
ADD COLUMN     "publishError" TEXT,
ADD COLUMN     "publishAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastPublishAttemptAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ContentPost_publishStatus_scheduledDate_idx" ON "ContentPost"("publishStatus", "scheduledDate");
