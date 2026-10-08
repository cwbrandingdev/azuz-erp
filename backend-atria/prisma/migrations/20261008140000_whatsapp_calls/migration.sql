CREATE TYPE "WhatsAppCallDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "WhatsAppCallStatus" AS ENUM ('CONNECTING', 'RINGING', 'IN_PROGRESS', 'ENDED', 'REJECTED', 'FAILED');

CREATE TABLE "whatsapp_calls" (
    "id" TEXT NOT NULL,
    "whatsapp_call_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "direction" "WhatsAppCallDirection" NOT NULL,
    "status" "WhatsAppCallStatus" NOT NULL,
    "offer_sdp" TEXT,
    "answer_sdp" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_calls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_calls_whatsapp_call_id_key" ON "whatsapp_calls"("whatsapp_call_id");
CREATE INDEX "whatsapp_calls_status_created_at_idx" ON "whatsapp_calls"("status", "created_at");
CREATE INDEX "whatsapp_calls_phone_created_at_idx" ON "whatsapp_calls"("phone", "created_at");
