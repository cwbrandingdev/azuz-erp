ALTER TABLE "lead_meetings" ADD COLUMN "guest_emails" TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN "reminder_sent_at" TIMESTAMP(3);
