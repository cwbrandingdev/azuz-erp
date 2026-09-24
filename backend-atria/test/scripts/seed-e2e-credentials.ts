import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TEST_ADMIN, TEST_CLIENT_USER } from '../helpers/constants';
import { seedE2EData } from '../helpers/seed';

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedE2EData(prisma);

    const outDir = join(__dirname, '../../..', 'frontend-atria', 'e2e');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, '.credentials.json'),
      JSON.stringify(
        {
          admin: TEST_ADMIN,
          client: TEST_CLIENT_USER,
        },
        null,
        2,
      ),
    );

    console.log('E2E credentials seeded for Playwright');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
