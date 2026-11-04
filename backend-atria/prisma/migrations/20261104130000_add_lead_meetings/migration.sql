CREATE TABLE "lead_meetings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "guest_name" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "meet_url" TEXT,
    "calendar_event_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_meetings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lead_meetings_calendar_event_id_key" ON "lead_meetings"("calendar_event_id");

CREATE INDEX "lead_meetings_lead_id_start_at_idx" ON "lead_meetings"("lead_id", "start_at");

CREATE INDEX "lead_meetings_company_id_idx" ON "lead_meetings"("company_id");

ALTER TABLE "lead_meetings" ADD CONSTRAINT "lead_meetings_calendar_event_id_fkey" FOREIGN KEY ("calendar_event_id") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lead_meetings" ADD CONSTRAINT "lead_meetings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_meetings" ADD CONSTRAINT "lead_meetings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lead_meetings" ADD CONSTRAINT "lead_meetings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
