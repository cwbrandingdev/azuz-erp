/**
 * Copies client organizations, CLIENT-facing users, company representatives,
 * and legacy ClientPortalUser rows from PostgreSQL schema `public` into `dev`.
 *
 * Preserves user ids, password hashes, and client ids so existing credentials
 * keep working against the dev schema (local / SUPABASE_DB_SCHEMA=dev).
 *
 * Usage: node scripts/copy-client-logins-from-public.mjs
 * Requires DIRECT_URL or DATABASE_URL in .env (use direct connection, not pgbouncer, for DDL-heavy batches).
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const TARGET_SCHEMA = process.env.SUPABASE_DB_SCHEMA?.trim() || 'dev';
const SOURCE_SCHEMA = process.env.COPY_CLIENT_LOGINS_SOURCE_SCHEMA?.trim() || 'public';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
  },
});

function q(schema, table) {
  return `"${schema}"."${table}"`;
}

async function main() {
  console.log(`Copying client logins: ${SOURCE_SCHEMA} → ${TARGET_SCHEMA}`);

  const clientsCopied = await prisma.$executeRawUnsafe(`
    INSERT INTO ${q(TARGET_SCHEMA, 'Client')} (
      id, "companyName", "contactName", email, phone, instagram, "instagramUserId",
      "metaAccessToken", website, street, number, city, state, "zipCode", notes,
      "avatarUrl", "createdAt", "updatedAt", "clientGroupId", document, neighborhood,
      "companyId", "isActive", crm_enabled
    )
    SELECT
      c.id, c."companyName", c."contactName", c.email, c.phone, c.instagram, c."instagramUserId",
      c."metaAccessToken", c.website, c.street, c.number, c.city, c.state, c."zipCode", c.notes,
      c."avatarUrl", c."createdAt", c."updatedAt", c."clientGroupId", c.document, c.neighborhood,
      c."companyId", c."isActive", c.crm_enabled
    FROM ${q(SOURCE_SCHEMA, 'Client')} c
    WHERE EXISTS (
      SELECT 1 FROM ${q(SOURCE_SCHEMA, 'User')} u
      JOIN ${q(SOURCE_SCHEMA, 'Role')} r ON r.id = u."roleId"
      WHERE u."clientId" = c.id
        AND (r.name IN ('CLIENT', 'EXTERNAL_CLIENT_CRM') OR u.category = 'CLIENT')
    )
    OR EXISTS (
      SELECT 1 FROM ${q(SOURCE_SCHEMA, 'ClientPortalUser')} pu WHERE pu."clientId" = c.id
    )
    ON CONFLICT (id) DO UPDATE SET
      "companyName" = EXCLUDED."companyName",
      "contactName" = EXCLUDED."contactName",
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      instagram = EXCLUDED.instagram,
      "instagramUserId" = EXCLUDED."instagramUserId",
      website = EXCLUDED.website,
      street = EXCLUDED.street,
      number = EXCLUDED.number,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      "zipCode" = EXCLUDED."zipCode",
      notes = EXCLUDED.notes,
      "avatarUrl" = EXCLUDED."avatarUrl",
      "updatedAt" = EXCLUDED."updatedAt",
      document = EXCLUDED.document,
      neighborhood = EXCLUDED.neighborhood,
      "isActive" = EXCLUDED."isActive",
      crm_enabled = EXCLUDED.crm_enabled
  `);
  console.log(`Clients upserted (statement count): ${clientsCopied}`);

  const usersCopied = await prisma.$executeRawUnsafe(`
    INSERT INTO ${q(TARGET_SCHEMA, 'User')} (
      id, email, "passwordHash", name, "avatarUrl", "roleId", "createdAt", "updatedAt",
      "monthlySalary", "userGroupId", "mustChangePassword", "temporaryPassword",
      "clientId", "companyId", category, "isActive"
    )
    SELECT
      pu.id, pu.email, pu."passwordHash", pu.name, pu."avatarUrl", dr.id,
      pu."createdAt", pu."updatedAt", pu."monthlySalary", NULL,
      pu."mustChangePassword", pu."temporaryPassword", pu."clientId", pu."companyId",
      (pu.category::text)::${TARGET_SCHEMA}."UserCategory", pu."isActive"
    FROM ${q(SOURCE_SCHEMA, 'User')} pu
    JOIN ${q(SOURCE_SCHEMA, 'Role')} pr ON pr.id = pu."roleId"
    JOIN ${q(TARGET_SCHEMA, 'Role')} dr ON dr.name::text = pr.name::text
    WHERE pr.name IN ('CLIENT', 'EXTERNAL_CLIENT_CRM') OR pu.category = 'CLIENT'
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      "passwordHash" = EXCLUDED."passwordHash",
      name = EXCLUDED.name,
      "avatarUrl" = EXCLUDED."avatarUrl",
      "roleId" = EXCLUDED."roleId",
      "updatedAt" = EXCLUDED."updatedAt",
      "mustChangePassword" = EXCLUDED."mustChangePassword",
      "temporaryPassword" = EXCLUDED."temporaryPassword",
      "clientId" = EXCLUDED."clientId",
      category = EXCLUDED.category,
      "isActive" = EXCLUDED."isActive"
  `);
  console.log(`Client users upserted (statement count): ${usersCopied}`);

  const repsCopied = await prisma.$executeRawUnsafe(`
    INSERT INTO ${q(TARGET_SCHEMA, 'company_representatives')} (
      id, company_id, user_id, title, is_primary, created_at, updated_at
    )
    SELECT cr.id, cr.company_id, cr.user_id, cr.title, cr.is_primary, cr.created_at, cr.updated_at
    FROM ${q(SOURCE_SCHEMA, 'company_representatives')} cr
    WHERE EXISTS (
      SELECT 1 FROM ${q(SOURCE_SCHEMA, 'User')} pu
      JOIN ${q(SOURCE_SCHEMA, 'Role')} pr ON pr.id = pu."roleId"
      WHERE pu.id = cr.user_id
        AND (pr.name IN ('CLIENT', 'EXTERNAL_CLIENT_CRM') OR pu.category = 'CLIENT')
    )
    ON CONFLICT (company_id, user_id) DO UPDATE SET
      title = EXCLUDED.title,
      is_primary = EXCLUDED.is_primary,
      updated_at = EXCLUDED.updated_at
  `);
  console.log(`Company representatives upserted (statement count): ${repsCopied}`);

  const portalUsersCopied = await prisma.$executeRawUnsafe(`
    INSERT INTO ${q(TARGET_SCHEMA, 'ClientPortalUser')} (
      id, "clientId", email, "passwordHash", "temporaryPassword",
      "mustChangePassword", "createdAt", "updatedAt"
    )
    SELECT
      pu.id, pu."clientId", pu.email, pu."passwordHash", pu."temporaryPassword",
      pu."mustChangePassword", pu."createdAt", pu."updatedAt"
    FROM ${q(SOURCE_SCHEMA, 'ClientPortalUser')} pu
    ON CONFLICT ("clientId") DO UPDATE SET
      email = EXCLUDED.email,
      "passwordHash" = EXCLUDED."passwordHash",
      "temporaryPassword" = EXCLUDED."temporaryPassword",
      "mustChangePassword" = EXCLUDED."mustChangePassword",
      "updatedAt" = EXCLUDED."updatedAt"
  `);
  console.log(`ClientPortalUser upserted (statement count): ${portalUsersCopied}`);

  const summary = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS count
    FROM ${q(TARGET_SCHEMA, 'User')} u
    JOIN ${q(TARGET_SCHEMA, 'Role')} r ON r.id = u."roleId"
    WHERE r.name IN ('CLIENT', 'EXTERNAL_CLIENT_CRM') OR u.category = 'CLIENT'
  `);
  console.log(`Done. Client-facing users in ${TARGET_SCHEMA}:`, summary);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
