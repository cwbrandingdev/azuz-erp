CREATE TYPE "WhatsAppConversationStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'SNOOZED');
CREATE TYPE "WhatsAppConversationPriority" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "status" "WhatsAppConversationStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "WhatsAppConversationPriority" NOT NULL DEFAULT 'NONE',
    "assigned_user_id" TEXT,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_preview" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_conversations_phone_key" ON "whatsapp_conversations"("phone");
CREATE INDEX "whatsapp_conversations_status_last_message_at_idx" ON "whatsapp_conversations"("status", "last_message_at");
CREATE INDEX "whatsapp_conversations_assigned_user_id_idx" ON "whatsapp_conversations"("assigned_user_id");

ALTER TABLE "whatsapp_conversations"
  ADD CONSTRAINT "whatsapp_conversations_assigned_user_id_fkey"
  FOREIGN KEY ("assigned_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "is_private" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "sent_by_user_id" TEXT;
ALTER TABLE "whatsapp_messages" ADD COLUMN IF NOT EXISTS "conversation_id" TEXT;

CREATE INDEX IF NOT EXISTS "whatsapp_messages_conversation_id_created_at_idx"
  ON "whatsapp_messages"("conversation_id", "created_at");

ALTER TABLE "whatsapp_messages"
  ADD CONSTRAINT "whatsapp_messages_sent_by_user_id_fkey"
  FOREIGN KEY ("sent_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages"
  ADD CONSTRAINT "whatsapp_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "whatsapp_canned_responses" (
    "id" TEXT NOT NULL,
    "short_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_canned_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_canned_responses_short_code_key" ON "whatsapp_canned_responses"("short_code");

INSERT INTO "whatsapp_canned_responses" ("id", "short_code", "title", "content", "created_at", "updated_at")
VALUES
  ('11111111-1111-4111-8111-111111111111', 'ola', 'Saudação', 'Olá! Obrigado por falar com a gente. Como posso ajudar?', NOW(), NOW()),
  ('22222222-2222-4222-8222-222222222222', 'horario', 'Horário', 'Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.', NOW(), NOW()),
  ('33333333-3333-4333-8333-333333333333', 'aguardando', 'Aguardando', 'Estou verificando isso internamente e já retorno com uma resposta.', NOW(), NOW());
