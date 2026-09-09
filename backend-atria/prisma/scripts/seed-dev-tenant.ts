import { PrismaClient } from '@prisma/client';
import { seedDevTenant } from '../../src/tenancy/infrastructure/dev-tenant-seed';

const prisma = new PrismaClient();

async function main() {
  const { tenant, assigned } = await seedDevTenant(prisma);
  console.log(
    `Tenant "${tenant.slug}" ready (${tenant.id}). Assigned ${assigned} previously unscoped row(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
