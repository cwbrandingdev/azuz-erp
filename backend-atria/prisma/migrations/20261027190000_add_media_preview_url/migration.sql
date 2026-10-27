ALTER TABLE "KanbanTaskAsset" ADD COLUMN IF NOT EXISTS "previewUrl" TEXT;
ALTER TABLE "ContentAttachment" ADD COLUMN IF NOT EXISTS "previewUrl" TEXT;
ALTER TABLE "deliverable_items" ADD COLUMN IF NOT EXISTS "previewUrl" TEXT;
