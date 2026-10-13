CREATE TYPE "WhatsAppMessageKind" AS ENUM (
  'TEXT',
  'IMAGE',
  'DOCUMENT',
  'AUDIO',
  'VIDEO',
  'LOCATION',
  'TEMPLATE',
  'STICKER'
);

ALTER TABLE "whatsapp_messages"
  ADD COLUMN IF NOT EXISTS "kind" "WhatsAppMessageKind" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN IF NOT EXISTS "media_url" TEXT,
  ADD COLUMN IF NOT EXISTS "media_mime_type" TEXT,
  ADD COLUMN IF NOT EXISTS "media_filename" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "location_name" TEXT,
  ADD COLUMN IF NOT EXISTS "location_address" TEXT,
  ADD COLUMN IF NOT EXISTS "is_view_once" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_voice_note" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "transcription" TEXT,
  ADD COLUMN IF NOT EXISTS "template_name" TEXT,
  ADD COLUMN IF NOT EXISTS "template_language" TEXT;

ALTER TABLE "whatsapp_canned_responses"
  ADD COLUMN IF NOT EXISTS "kind" "WhatsAppMessageKind" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN IF NOT EXISTS "media_url" TEXT,
  ADD COLUMN IF NOT EXISTS "media_mime_type" TEXT,
  ADD COLUMN IF NOT EXISTS "media_filename" TEXT;
