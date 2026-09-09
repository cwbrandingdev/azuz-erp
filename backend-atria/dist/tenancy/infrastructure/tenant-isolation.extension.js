"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantIsolationExtension = createTenantIsolationExtension;
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const tenant_constants_1 = require("../domain/tenant.constants");
const tenant_context_1 = require("../domain/tenant-context");
const tenant_isolation_1 = require("./tenant-isolation");
function notFound(model) {
    return new library_1.PrismaClientKnownRequestError(`No ${model} record found.`, {
        code: 'P2025',
        clientVersion: client_1.Prisma.prismaVersion.client,
    });
}
function createTenantIsolationExtension(base) {
    return client_1.Prisma.defineExtension({
        name: 'tenant-isolation',
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const tenantId = (0, tenant_context_1.getCurrentTenantId)();
                    if (!tenantId || !tenant_constants_1.TENANT_SCOPED_MODEL_SET.has(model)) {
                        return query(args);
                    }
                    const delegate = base[(0, tenant_isolation_1.toDelegateName)(model)];
                    if ((0, tenant_isolation_1.isUniqueRead)(operation) || (0, tenant_isolation_1.isUniqueWrite)(operation)) {
                        const owned = await delegate.findFirst({
                            where: {
                                ...(0, tenant_isolation_1.uniqueWhereToFilter)(args.where),
                                tenantId,
                            },
                            select: { id: true },
                        });
                        if (!owned) {
                            if (operation === 'findUnique') {
                                return null;
                            }
                            if (operation === 'upsert') {
                                const nextArgs = (0, tenant_isolation_1.applyTenantToArgs)(operation, args, tenantId);
                                return query(nextArgs);
                            }
                            throw notFound(model);
                        }
                        if (operation === 'upsert') {
                            const nextArgs = (0, tenant_isolation_1.applyTenantToArgs)(operation, args, tenantId);
                            return query(nextArgs);
                        }
                        return query(args);
                    }
                    const nextArgs = (0, tenant_isolation_1.applyTenantToArgs)(operation, args, tenantId);
                    return query(nextArgs);
                },
            },
        },
    });
}
//# sourceMappingURL=tenant-isolation.extension.js.map