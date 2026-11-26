CREATE TABLE "google_calendar_connections" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "account_email" TEXT,
    "connected_by_id" TEXT,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_calendar_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "google_calendar_connections_company_id_key"
    ON "google_calendar_connections"("company_id");

ALTER TABLE "google_calendar_connections"
    ADD CONSTRAINT "google_calendar_connections_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "Company"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "google_calendar_connections"
    ADD CONSTRAINT "google_calendar_connections_connected_by_id_fkey"
    FOREIGN KEY ("connected_by_id") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
