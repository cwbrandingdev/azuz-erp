CREATE TYPE "dev"."TimeClockPunchType" AS ENUM ('IN', 'OUT');

CREATE TABLE "dev"."time_clock_punches" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "dev"."TimeClockPunchType" NOT NULL,
    "punched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "time_clock_punches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "time_clock_punches_company_id_punched_at_idx" ON "dev"."time_clock_punches"("company_id", "punched_at");
CREATE INDEX "time_clock_punches_user_id_punched_at_idx" ON "dev"."time_clock_punches"("user_id", "punched_at");

ALTER TABLE "dev"."time_clock_punches" ADD CONSTRAINT "time_clock_punches_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "dev"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dev"."time_clock_punches" ADD CONSTRAINT "time_clock_punches_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "dev"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dev"."time_clock_punches" ADD CONSTRAINT "time_clock_punches_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "dev"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dev"."time_clock_punches" ADD CONSTRAINT "time_clock_punches_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "dev"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
