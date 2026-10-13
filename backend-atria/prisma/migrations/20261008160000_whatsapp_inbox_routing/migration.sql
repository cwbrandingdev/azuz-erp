CREATE TYPE "WhatsAppRoutingMode" AS ENUM ('MANUAL', 'ROUND_ROBIN', 'WORKLOAD', 'SPECIALTY');

ALTER TABLE "whatsapp_conversations"
  ADD COLUMN IF NOT EXISTS "queued_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "assigned_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_agent_reply_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_customer_message_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "whatsapp_conversations_queued_at_idx"
  ON "whatsapp_conversations"("queued_at");

CREATE TABLE "whatsapp_inbox_settings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "routing_mode" "WhatsAppRoutingMode" NOT NULL DEFAULT 'MANUAL',
    "sla_first_response_minutes" INTEGER NOT NULL DEFAULT 5,
    "auto_reassign_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_reassign_minutes" INTEGER NOT NULL DEFAULT 15,
    "round_robin_index" INTEGER NOT NULL DEFAULT 0,
    "agent_user_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_inbox_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_inbox_settings_company_id_key" ON "whatsapp_inbox_settings"("company_id");

ALTER TABLE "whatsapp_inbox_settings"
  ADD CONSTRAINT "whatsapp_inbox_settings_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "whatsapp_routing_rules" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "match_label" TEXT,
    "match_stage_id" TEXT,
    "match_source" TEXT,
    "target_user_group_id" TEXT,
    "target_user_id" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_routing_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_routing_rules_company_id_priority_idx"
  ON "whatsapp_routing_rules"("company_id", "priority");

ALTER TABLE "whatsapp_routing_rules"
  ADD CONSTRAINT "whatsapp_routing_rules_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
