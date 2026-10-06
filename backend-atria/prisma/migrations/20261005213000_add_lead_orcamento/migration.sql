ALTER TABLE "Company" ADD COLUMN "crm_show_orcamento" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Client" ADD COLUMN "crm_show_orcamento" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "leads" ADD COLUMN "orcamento" DECIMAL(12, 2);
