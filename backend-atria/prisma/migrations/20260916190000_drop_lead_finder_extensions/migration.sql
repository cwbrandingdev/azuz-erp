-- Revert lead finder extensions (removed from application schema)

DROP TABLE IF EXISTS "prospecting_list_leads";
DROP TABLE IF EXISTS "prospecting_lists";
DROP TABLE IF EXISTS "lead_activities";

ALTER TABLE "lead_search_sessions" DROP CONSTRAINT IF EXISTS "lead_search_sessions_created_by_id_fkey";
DROP INDEX IF EXISTS "lead_search_sessions_tenant_id_created_by_id_idx";
ALTER TABLE "lead_search_sessions" DROP COLUMN IF EXISTS "created_by_id";

ALTER TABLE "Company" DROP COLUMN IF EXISTS "prospecting_whatsapp_templates";
