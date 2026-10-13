ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "cnpj" TEXT,
  ADD COLUMN IF NOT EXISTS "job_title" TEXT;

CREATE TYPE "WhatsAppCrmEventType" AS ENUM (
  'STAGE_CHANGE',
  'FIELD_CHANGE',
  'AUTO_MESSAGE',
  'LEAD_CREATED'
);

CREATE TABLE "whatsapp_stage_messages" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "body" TEXT,
    "template_name" TEXT,
    "template_language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_stage_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_stage_messages_company_id_stage_id_key"
  ON "whatsapp_stage_messages"("company_id", "stage_id");

CREATE INDEX "whatsapp_stage_messages_company_id_idx"
  ON "whatsapp_stage_messages"("company_id");

ALTER TABLE "whatsapp_stage_messages"
  ADD CONSTRAINT "whatsapp_stage_messages_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_stage_messages"
  ADD CONSTRAINT "whatsapp_stage_messages_stage_id_fkey"
  FOREIGN KEY ("stage_id") REFERENCES "lead_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "whatsapp_crm_events" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "phone" TEXT NOT NULL,
    "type" "WhatsAppCrmEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "actor_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_crm_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_crm_events_phone_created_at_idx"
  ON "whatsapp_crm_events"("phone", "created_at");

CREATE INDEX "whatsapp_crm_events_lead_id_created_at_idx"
  ON "whatsapp_crm_events"("lead_id", "created_at");

CREATE INDEX "whatsapp_crm_events_company_id_created_at_idx"
  ON "whatsapp_crm_events"("company_id", "created_at");

ALTER TABLE "whatsapp_crm_events"
  ADD CONSTRAINT "whatsapp_crm_events_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_crm_events"
  ADD CONSTRAINT "whatsapp_crm_events_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whatsapp_crm_events"
  ADD CONSTRAINT "whatsapp_crm_events_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
