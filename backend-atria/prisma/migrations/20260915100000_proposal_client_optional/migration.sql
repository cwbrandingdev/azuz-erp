-- AlterTable
ALTER TABLE "Proposal" ALTER COLUMN "clientId" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "Proposal" DROP CONSTRAINT "Proposal_clientId_fkey";

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
