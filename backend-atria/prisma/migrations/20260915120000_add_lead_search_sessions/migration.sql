CREATE TYPE "LeadSearchQueryType" AS ENUM ('NICHO', 'CNAE');

CREATE TABLE "lead_search_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "query_type" "LeadSearchQueryType" NOT NULL,
    "query_value" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_search_sessions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "leads" ADD COLUMN "search_session_id" TEXT;

CREATE INDEX "lead_search_sessions_tenant_id_created_at_idx" ON "lead_search_sessions"("tenant_id", "created_at");

CREATE INDEX "leads_search_session_id_idx" ON "leads"("search_session_id");

ALTER TABLE "lead_search_sessions" ADD CONSTRAINT "lead_search_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leads" ADD CONSTRAINT "leads_search_session_id_fkey" FOREIGN KEY ("search_session_id") REFERENCES "lead_search_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
