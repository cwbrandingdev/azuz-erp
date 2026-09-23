CREATE TYPE "DreGroup" AS ENUM (
  'GROSS_REVENUE',
  'DEDUCTION',
  'VARIABLE_COST',
  'FIXED_EXPENSE',
  'FINANCIAL_RESULT',
  'PROFIT_DISTRIBUTION',
  'TRANSFER',
  'OTHER'
);

CREATE TYPE "CashFlowBlock" AS ENUM (
  'OPERATIONAL',
  'FINANCIAL_MOVEMENTS',
  'OWN_ACCOUNT_TRANSFER'
);

ALTER TABLE "FinancialCategory" ADD COLUMN "code" TEXT;
ALTER TABLE "FinancialCategory" ADD COLUMN "parentId" TEXT;
ALTER TABLE "FinancialCategory" ADD COLUMN "dreGroup" "DreGroup";
ALTER TABLE "FinancialCategory" ADD COLUMN "cashFlowBlock" "CashFlowBlock" NOT NULL DEFAULT 'OPERATIONAL';
ALTER TABLE "FinancialCategory" ADD COLUMN "isGroup" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "FinancialCategory_companyId_code_key" ON "FinancialCategory"("companyId", "code");
CREATE INDEX "FinancialCategory_parentId_idx" ON "FinancialCategory"("parentId");

ALTER TABLE "FinancialCategory"
  ADD CONSTRAINT "FinancialCategory_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "FinancialCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "BankAccount" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "institution" TEXT,
  "initialBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "companyId" TEXT NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001',
  CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankAccount_companyId_name_key" ON "BankAccount"("companyId", "name");
CREATE INDEX "BankAccount_companyId_idx" ON "BankAccount"("companyId");

ALTER TABLE "BankAccount"
  ADD CONSTRAINT "BankAccount_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinancialTransaction" ADD COLUMN "bankAccountId" TEXT;
CREATE INDEX "FinancialTransaction_bankAccountId_idx" ON "FinancialTransaction"("bankAccountId");

ALTER TABLE "FinancialTransaction"
  ADD CONSTRAINT "FinancialTransaction_bankAccountId_fkey"
  FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "BankStatementLine" (
  "id" TEXT NOT NULL,
  "bankAccountId" TEXT NOT NULL,
  "fitId" TEXT,
  "postedAt" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "description" TEXT NOT NULL,
  "type" "TransactionType" NOT NULL,
  "ignored" BOOLEAN NOT NULL DEFAULT false,
  "transactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "companyId" TEXT NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001',
  CONSTRAINT "BankStatementLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankStatementLine_transactionId_key" ON "BankStatementLine"("transactionId");
CREATE UNIQUE INDEX "BankStatementLine_bankAccountId_fitId_key" ON "BankStatementLine"("bankAccountId", "fitId");
CREATE INDEX "BankStatementLine_companyId_idx" ON "BankStatementLine"("companyId");
CREATE INDEX "BankStatementLine_bankAccountId_idx" ON "BankStatementLine"("bankAccountId");

ALTER TABLE "BankStatementLine"
  ADD CONSTRAINT "BankStatementLine_bankAccountId_fkey"
  FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankStatementLine"
  ADD CONSTRAINT "BankStatementLine_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BankStatementLine"
  ADD CONSTRAINT "BankStatementLine_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
