-- Fase 0: credenciais WhatsApp Cloud API por empresa
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "whatsapp_phone_number_id" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "whatsapp_business_account_id" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "whatsapp_verify_token" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Company_whatsapp_phone_number_id_key"
  ON "Company"("whatsapp_phone_number_id");

-- Fase 1/2: conversas e mensagens
CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "wa_id" TEXT NOT NULL,
    "phone" TEXT,
    "lead_id" TEXT,
    "client_id" TEXT,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_preview" TEXT,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_conversations_company_id_wa_id_key"
  ON "whatsapp_conversations"("company_id", "wa_id");
CREATE INDEX "whatsapp_conversations_company_id_last_message_at_idx"
  ON "whatsapp_conversations"("company_id", "last_message_at");
CREATE INDEX "whatsapp_conversations_lead_id_idx" ON "whatsapp_conversations"("lead_id");
CREATE INDEX "whatsapp_conversations_client_id_idx" ON "whatsapp_conversations"("client_id");

CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "body" TEXT,
    "template_name" TEXT,
    "wa_message_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "sent_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_messages_wa_message_id_key" ON "whatsapp_messages"("wa_message_id");
CREATE INDEX "whatsapp_messages_conversation_id_created_at_idx"
  ON "whatsapp_messages"("conversation_id", "created_at");
CREATE INDEX "whatsapp_messages_company_id_idx" ON "whatsapp_messages"("company_id");
CREATE INDEX "whatsapp_messages_sent_by_user_id_idx" ON "whatsapp_messages"("sent_by_user_id");

ALTER TABLE "whatsapp_conversations"
  ADD CONSTRAINT "whatsapp_conversations_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversations"
  ADD CONSTRAINT "whatsapp_conversations_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_conversations"
  ADD CONSTRAINT "whatsapp_conversations_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whatsapp_messages"
  ADD CONSTRAINT "whatsapp_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages"
  ADD CONSTRAINT "whatsapp_messages_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages"
  ADD CONSTRAINT "whatsapp_messages_sent_by_user_id_fkey"
  FOREIGN KEY ("sent_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
