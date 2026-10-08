DROP TABLE IF EXISTS "whatsapp_messages";
DROP TABLE IF EXISTS "whatsapp_conversations";

DO $$ BEGIN
  CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "whatsapp_message_id" TEXT,
    "from_phone" TEXT NOT NULL,
    "to_phone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "direction" "WhatsAppMessageDirection" NOT NULL,
    "status" "WhatsAppMessageStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_messages_whatsapp_message_id_key" ON "whatsapp_messages"("whatsapp_message_id");
CREATE INDEX "whatsapp_messages_from_phone_created_at_idx" ON "whatsapp_messages"("from_phone", "created_at");
CREATE INDEX "whatsapp_messages_to_phone_created_at_idx" ON "whatsapp_messages"("to_phone", "created_at");
