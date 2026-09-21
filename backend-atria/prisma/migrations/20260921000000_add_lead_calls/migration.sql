CREATE TABLE "lead_calls" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "twilio_call_sid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "outcome" TEXT NOT NULL DEFAULT 'INITIATED',
    "duration_seconds" INTEGER,
    "notes" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_calls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lead_calls_twilio_call_sid_key" ON "lead_calls"("twilio_call_sid");
CREATE INDEX "lead_calls_lead_id_created_at_idx" ON "lead_calls"("lead_id", "created_at");
CREATE INDEX "lead_calls_company_id_idx" ON "lead_calls"("company_id");
CREATE INDEX "lead_calls_user_id_idx" ON "lead_calls"("user_id");

ALTER TABLE "lead_calls" ADD CONSTRAINT "lead_calls_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_calls" ADD CONSTRAINT "lead_calls_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_calls" ADD CONSTRAINT "lead_calls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
