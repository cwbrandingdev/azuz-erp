ALTER TABLE "crm_reminder_tasks" ADD COLUMN "user_id" TEXT;
ALTER TABLE "crm_reminder_tasks" ADD COLUMN "notified_at" TIMESTAMP(3);

ALTER TABLE "crm_reminder_tasks"
  ADD CONSTRAINT "crm_reminder_tasks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "crm_reminder_tasks_status_notified_at_due_date_idx"
  ON "crm_reminder_tasks"("status", "notified_at", "due_date");

-- Evita que todos os lembretes já vencidos disparem aviso de uma vez no primeiro ciclo do cron.
UPDATE "crm_reminder_tasks" SET "notified_at" = NOW() WHERE "due_date" <= NOW();
