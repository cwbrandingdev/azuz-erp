import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_NAME,
  DEFAULT_TENANT_SLUG,
  DEV_SCHEMA,
  DEV_TENANT_TABLES,
} from '../domain/tenant.constants';

export function assertDevSchema(databaseUrl: string | undefined): void {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  let schema: string | null;
  try {
    schema = new URL(databaseUrl).searchParams.get('schema');
  } catch {
    throw new Error('DATABASE_URL is invalid');
  }

  if (schema !== DEV_SCHEMA) {
    throw new Error(
      `Refusing to run tenant seed: DATABASE_URL schema must be "${DEV_SCHEMA}"`,
    );
  }
}

export async function seedDevTenant(prisma: PrismaClient) {
  assertDevSchema(process.env.DATABASE_URL);
  await prisma.$executeRawUnsafe(`SET search_path TO "${DEV_SCHEMA}"`);

  let tenant = await prisma.tenant.findUnique({
    where: { slug: DEFAULT_TENANT_SLUG },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: DEFAULT_TENANT_ID,
        name: DEFAULT_TENANT_NAME,
        slug: DEFAULT_TENANT_SLUG,
      },
    });
  }

  let assigned = 0;
  for (const table of DEV_TENANT_TABLES) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "${DEV_SCHEMA}"."${table}" SET "tenantId" = $1 WHERE "tenantId" IS NULL`,
      tenant.id,
    );
    assigned += Number(result);
  }

  return { tenant, assigned };
}
