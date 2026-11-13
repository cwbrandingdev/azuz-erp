CREATE TABLE "jhonatan_calendar" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "title" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jhonatan_calendar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "jhonatan_calendar_company_id_start_at_idx" ON "jhonatan_calendar"("company_id", "start_at");

CREATE INDEX "jhonatan_calendar_lead_id_idx" ON "jhonatan_calendar"("lead_id");

ALTER TABLE "jhonatan_calendar" ADD CONSTRAINT "jhonatan_calendar_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "jhonatan_calendar" ADD CONSTRAINT "jhonatan_calendar_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "jhonatan_calendar" ADD CONSTRAINT "jhonatan_calendar_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
