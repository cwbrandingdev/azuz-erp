"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertDevSchema = assertDevSchema;
exports.seedDevTenant = seedDevTenant;
const tenant_constants_1 = require("../domain/tenant.constants");
function assertDevSchema(databaseUrl) {
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required');
    }
    let schema;
    try {
        schema = new URL(databaseUrl).searchParams.get('schema');
    }
    catch {
        throw new Error('DATABASE_URL is invalid');
    }
    if (schema !== tenant_constants_1.DEV_SCHEMA) {
        throw new Error(`Refusing to run tenant seed: DATABASE_URL schema must be "${tenant_constants_1.DEV_SCHEMA}"`);
    }
}
async function seedDevTenant(prisma) {
    assertDevSchema(process.env.DATABASE_URL);
    await prisma.$executeRawUnsafe(`SET search_path TO "${tenant_constants_1.DEV_SCHEMA}"`);
    let tenant = await prisma.tenant.findUnique({
        where: { slug: tenant_constants_1.DEFAULT_TENANT_SLUG },
    });
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                id: tenant_constants_1.DEFAULT_TENANT_ID,
                name: tenant_constants_1.DEFAULT_TENANT_NAME,
                slug: tenant_constants_1.DEFAULT_TENANT_SLUG,
            },
        });
    }
    let assigned = 0;
    for (const table of tenant_constants_1.DEV_TENANT_TABLES) {
        const result = await prisma.$executeRawUnsafe(`UPDATE "${tenant_constants_1.DEV_SCHEMA}"."${table}" SET "tenantId" = $1 WHERE "tenantId" IS NULL`, tenant.id);
        assigned += Number(result);
    }
    return { tenant, assigned };
}
//# sourceMappingURL=dev-tenant-seed.js.map