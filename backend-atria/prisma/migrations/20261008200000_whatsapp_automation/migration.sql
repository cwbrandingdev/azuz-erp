ALTER TABLE "whatsapp_inbox_settings"
  ADD COLUMN IF NOT EXISTS "bot_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ai_auto_reply" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "WhatsAppBotSessionStatus" AS ENUM ('ACTIVE', 'HANDED_OFF', 'STOPPED');
CREATE TYPE "WhatsAppBroadcastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'DONE', 'FAILED');
CREATE TYPE "WhatsAppBroadcastRecipientStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'REPLIED', 'FAILED');
CREATE TYPE "WhatsAppTriggerEvent" AS ENUM ('CART_ABANDONED', 'APPOINTMENT', 'PIX_BOLETO', 'POST_SALE');

CREATE TABLE "whatsapp_bot_flows" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "definition" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_bot_flows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_bot_flows_company_id_enabled_idx" ON "whatsapp_bot_flows"("company_id", "enabled");

ALTER TABLE "whatsapp_bot_flows"
  ADD CONSTRAINT "whatsapp_bot_flows_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "whatsapp_bot_sessions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "waiting_type" TEXT NOT NULL DEFAULT 'NONE',
    "collected" JSONB NOT NULL DEFAULT '{}',
    "status" "WhatsAppBotSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_bot_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_bot_sessions_company_id_phone_key" ON "whatsapp_bot_sessions"("company_id", "phone");
CREATE INDEX "whatsapp_bot_sessions_flow_id_idx" ON "whatsapp_bot_sessions"("flow_id");

ALTER TABLE "whatsapp_bot_sessions"
  ADD CONSTRAINT "whatsapp_bot_sessions_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "whatsapp_bot_sessions"
  ADD CONSTRAINT "whatsapp_bot_sessions_flow_id_fkey"
  FOREIGN KEY ("flow_id") REFERENCES "whatsapp_bot_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "whatsapp_broadcasts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WhatsAppBroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "body" TEXT,
    "template_name" TEXT,
    "template_language" TEXT,
    "match_label" TEXT,
    "match_stage_id" TEXT,
    "match_source" TEXT,
    "match_lead_status" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "rate_per_minute" INTEGER NOT NULL DEFAULT 20,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "read_count" INTEGER NOT NULL DEFAULT 0,
    "replied_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_broadcasts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_broadcasts_company_id_status_idx" ON "whatsapp_broadcasts"("company_id", "status");

ALTER TABLE "whatsapp_broadcasts"
  ADD CONSTRAINT "whatsapp_broadcasts_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "whatsapp_broadcast_recipients" (
    "id" TEXT NOT NULL,
    "broadcast_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "WhatsAppBroadcastRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "whatsapp_message_id" TEXT,
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_broadcast_recipients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_broadcast_recipients_broadcast_id_status_idx" ON "whatsapp_broadcast_recipients"("broadcast_id", "status");
CREATE INDEX "whatsapp_broadcast_recipients_whatsapp_message_id_idx" ON "whatsapp_broadcast_recipients"("whatsapp_message_id");
CREATE INDEX "whatsapp_broadcast_recipients_phone_idx" ON "whatsapp_broadcast_recipients"("phone");

ALTER TABLE "whatsapp_broadcast_recipients"
  ADD CONSTRAINT "whatsapp_broadcast_recipients_broadcast_id_fkey"
  FOREIGN KEY ("broadcast_id") REFERENCES "whatsapp_broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "whatsapp_triggers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "event_type" "WhatsAppTriggerEvent" NOT NULL,
    "delay_minutes" INTEGER NOT NULL DEFAULT 0,
    "body" TEXT,
    "template_name" TEXT,
    "template_language" TEXT,
    "match_stage_id" TEXT,
    "match_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_triggers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_triggers_company_id_event_type_enabled_idx" ON "whatsapp_triggers"("company_id", "event_type", "enabled");

ALTER TABLE "whatsapp_triggers"
  ADD CONSTRAINT "whatsapp_triggers_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "whatsapp_trigger_dispatches" (
    "id" TEXT NOT NULL,
    "trigger_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "entity_key" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_trigger_dispatches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_trigger_dispatches_trigger_id_entity_key_key" ON "whatsapp_trigger_dispatches"("trigger_id", "entity_key");
CREATE INDEX "whatsapp_trigger_dispatches_phone_idx" ON "whatsapp_trigger_dispatches"("phone");

ALTER TABLE "whatsapp_trigger_dispatches"
  ADD CONSTRAINT "whatsapp_trigger_dispatches_trigger_id_fkey"
  FOREIGN KEY ("trigger_id") REFERENCES "whatsapp_triggers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
