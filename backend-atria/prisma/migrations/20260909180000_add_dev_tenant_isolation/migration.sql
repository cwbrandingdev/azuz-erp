CREATE SCHEMA IF NOT EXISTS "dev";

CREATE TABLE "dev"."Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "dev"."Tenant"("slug");

INSERT INTO "dev"."Tenant" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES (
    '00000000-0000-4000-8000-000000000010',
    'CW Branding',
    'cwbranding',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "dev"."Company" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."User" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."invitation_tokens" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."Message" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."FinancialCategory" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."FinancialTransaction" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."KanbanColumn" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."KanbanTask" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."CalendarEvent" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."Client" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."UserGroup" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."ClientGroup" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."ClientReport" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."ClientBrief" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."ContentPost" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."Contract" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."Proposal" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."Asset" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."notifications" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."AgencySettings" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."art_type_pricing" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."calendar_entries" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."agenda_events" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."client_requests" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."client_financial_attachments" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."tasks" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."client_reports" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."lead_stages" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."crm_reminder_tasks" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."leads" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."deletion_history" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."deliverables" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."system_suggestions" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "dev"."app_updates" ADD COLUMN "tenantId" TEXT;

UPDATE "dev"."Company" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."User" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."invitation_tokens" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."Message" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."FinancialCategory" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."FinancialTransaction" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."KanbanColumn" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."KanbanTask" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."CalendarEvent" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."Client" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."UserGroup" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."ClientGroup" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."ClientReport" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."ClientBrief" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."ContentPost" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."Contract" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."Proposal" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."Asset" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."notifications" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."AgencySettings" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."art_type_pricing" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."calendar_entries" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."agenda_events" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."client_requests" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."client_financial_attachments" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."tasks" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."client_reports" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."lead_stages" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."crm_reminder_tasks" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."leads" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."deletion_history" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."deliverables" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."system_suggestions" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;
UPDATE "dev"."app_updates" SET "tenantId" = '00000000-0000-4000-8000-000000000010' WHERE "tenantId" IS NULL;

ALTER TABLE "dev"."Company" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."Company" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."User" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."User" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."invitation_tokens" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."invitation_tokens" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."Message" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."Message" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."FinancialCategory" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."FinancialCategory" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."FinancialTransaction" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."FinancialTransaction" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."KanbanColumn" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."KanbanColumn" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."KanbanTask" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."KanbanTask" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."CalendarEvent" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."CalendarEvent" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."Client" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."Client" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."UserGroup" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."UserGroup" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."ClientGroup" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."ClientGroup" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."ClientReport" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."ClientReport" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."ClientBrief" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."ClientBrief" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."ContentPost" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."ContentPost" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."Contract" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."Contract" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."Proposal" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."Proposal" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."Asset" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."Asset" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."notifications" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."notifications" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."AgencySettings" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."AgencySettings" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."art_type_pricing" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."art_type_pricing" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."calendar_entries" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."calendar_entries" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."agenda_events" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."agenda_events" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."client_requests" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."client_requests" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."client_financial_attachments" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."client_financial_attachments" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."tasks" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."tasks" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."client_reports" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."client_reports" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."lead_stages" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."lead_stages" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."crm_reminder_tasks" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."crm_reminder_tasks" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."leads" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."leads" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."deletion_history" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."deletion_history" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."deliverables" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."deliverables" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."system_suggestions" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."system_suggestions" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';
ALTER TABLE "dev"."app_updates" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "dev"."app_updates" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-4000-8000-000000000010';

CREATE INDEX "Company_tenantId_id_idx" ON "dev"."Company"("tenantId", "id");
CREATE INDEX "User_tenantId_id_idx" ON "dev"."User"("tenantId", "id");
CREATE INDEX "InvitationToken_tenantId_id_idx" ON "dev"."invitation_tokens"("tenantId", "id");
CREATE INDEX "Message_tenantId_id_idx" ON "dev"."Message"("tenantId", "id");
CREATE INDEX "FinancialCategory_tenantId_id_idx" ON "dev"."FinancialCategory"("tenantId", "id");
CREATE INDEX "FinancialTransaction_tenantId_id_idx" ON "dev"."FinancialTransaction"("tenantId", "id");
CREATE INDEX "KanbanColumn_tenantId_id_idx" ON "dev"."KanbanColumn"("tenantId", "id");
CREATE INDEX "KanbanTask_tenantId_id_idx" ON "dev"."KanbanTask"("tenantId", "id");
CREATE INDEX "CalendarEvent_tenantId_id_idx" ON "dev"."CalendarEvent"("tenantId", "id");
CREATE INDEX "Client_tenantId_id_idx" ON "dev"."Client"("tenantId", "id");
CREATE INDEX "UserGroup_tenantId_id_idx" ON "dev"."UserGroup"("tenantId", "id");
CREATE INDEX "ClientGroup_tenantId_id_idx" ON "dev"."ClientGroup"("tenantId", "id");
CREATE INDEX "ClientReport_tenantId_id_idx" ON "dev"."ClientReport"("tenantId", "id");
CREATE INDEX "ClientBrief_tenantId_id_idx" ON "dev"."ClientBrief"("tenantId", "id");
CREATE INDEX "ContentPost_tenantId_id_idx" ON "dev"."ContentPost"("tenantId", "id");
CREATE INDEX "Contract_tenantId_id_idx" ON "dev"."Contract"("tenantId", "id");
CREATE INDEX "Proposal_tenantId_id_idx" ON "dev"."Proposal"("tenantId", "id");
CREATE INDEX "Asset_tenantId_id_idx" ON "dev"."Asset"("tenantId", "id");
CREATE INDEX "Notification_tenantId_id_idx" ON "dev"."notifications"("tenantId", "id");
CREATE INDEX "AgencySettings_tenantId_id_idx" ON "dev"."AgencySettings"("tenantId", "id");
CREATE INDEX "ArtTypePricing_tenantId_id_idx" ON "dev"."art_type_pricing"("tenantId", "id");
CREATE INDEX "CalendarEntry_tenantId_id_idx" ON "dev"."calendar_entries"("tenantId", "id");
CREATE INDEX "AgendaEvent_tenantId_id_idx" ON "dev"."agenda_events"("tenantId", "id");
CREATE INDEX "ClientRequest_tenantId_id_idx" ON "dev"."client_requests"("tenantId", "id");
CREATE INDEX "ClientFinancialAttachment_tenantId_id_idx" ON "dev"."client_financial_attachments"("tenantId", "id");
CREATE INDEX "Task_tenantId_id_idx" ON "dev"."tasks"("tenantId", "id");
CREATE INDEX "ClientReportFile_tenantId_id_idx" ON "dev"."client_reports"("tenantId", "id");
CREATE INDEX "LeadStage_tenantId_id_idx" ON "dev"."lead_stages"("tenantId", "id");
CREATE INDEX "CrmReminderTask_tenantId_id_idx" ON "dev"."crm_reminder_tasks"("tenantId", "id");
CREATE INDEX "Lead_tenantId_id_idx" ON "dev"."leads"("tenantId", "id");
CREATE INDEX "DeletionHistory_tenantId_id_idx" ON "dev"."deletion_history"("tenantId", "id");
CREATE INDEX "Deliverable_tenantId_id_idx" ON "dev"."deliverables"("tenantId", "id");
CREATE INDEX "SystemSuggestion_tenantId_id_idx" ON "dev"."system_suggestions"("tenantId", "id");
CREATE INDEX "AppUpdate_tenantId_id_idx" ON "dev"."app_updates"("tenantId", "id");

ALTER TABLE "dev"."Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."invitation_tokens" ADD CONSTRAINT "InvitationToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."Message" ADD CONSTRAINT "Message_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."FinancialCategory" ADD CONSTRAINT "FinancialCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."KanbanColumn" ADD CONSTRAINT "KanbanColumn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."KanbanTask" ADD CONSTRAINT "KanbanTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."CalendarEvent" ADD CONSTRAINT "CalendarEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."UserGroup" ADD CONSTRAINT "UserGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."ClientGroup" ADD CONSTRAINT "ClientGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."ClientReport" ADD CONSTRAINT "ClientReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."ClientBrief" ADD CONSTRAINT "ClientBrief_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."ContentPost" ADD CONSTRAINT "ContentPost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."Contract" ADD CONSTRAINT "Contract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."Proposal" ADD CONSTRAINT "Proposal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."Asset" ADD CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."notifications" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."AgencySettings" ADD CONSTRAINT "AgencySettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."art_type_pricing" ADD CONSTRAINT "ArtTypePricing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."calendar_entries" ADD CONSTRAINT "CalendarEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."agenda_events" ADD CONSTRAINT "AgendaEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."client_requests" ADD CONSTRAINT "ClientRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."client_financial_attachments" ADD CONSTRAINT "ClientFinancialAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."tasks" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."client_reports" ADD CONSTRAINT "ClientReportFile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."lead_stages" ADD CONSTRAINT "LeadStage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."crm_reminder_tasks" ADD CONSTRAINT "CrmReminderTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."leads" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."deletion_history" ADD CONSTRAINT "DeletionHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."deliverables" ADD CONSTRAINT "Deliverable_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."system_suggestions" ADD CONSTRAINT "SystemSuggestion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dev"."app_updates" ADD CONSTRAINT "AppUpdate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "dev"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
