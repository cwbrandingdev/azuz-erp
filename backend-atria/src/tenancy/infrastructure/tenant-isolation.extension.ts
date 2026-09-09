import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { TENANT_SCOPED_MODEL_SET } from '../domain/tenant.constants';
import { getCurrentTenantId } from '../domain/tenant-context';
import {
  applyTenantToArgs,
  isUniqueRead,
  isUniqueWrite,
  toDelegateName,
  uniqueWhereToFilter,
} from './tenant-isolation';

type TenantPeekDelegate = {
  findFirst: (args: {
    where: Record<string, unknown>;
    select: { id: true };
  }) => Promise<{ id: string } | null>;
};

function notFound(model: string): PrismaClientKnownRequestError {
  return new PrismaClientKnownRequestError(`No ${model} record found.`, {
    code: 'P2025',
    clientVersion: Prisma.prismaVersion.client,
  });
}

export function createTenantIsolationExtension(base: PrismaClient) {
  return Prisma.defineExtension({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantId = getCurrentTenantId();
          if (!tenantId || !TENANT_SCOPED_MODEL_SET.has(model)) {
            return query(args);
          }

          const delegate = (
            base as unknown as Record<string, TenantPeekDelegate>
          )[toDelegateName(model)];

          if (isUniqueRead(operation) || isUniqueWrite(operation)) {
            const owned = await delegate.findFirst({
              where: {
                ...uniqueWhereToFilter(
                  (args as { where?: Record<string, unknown> }).where,
                ),
                tenantId,
              },
              select: { id: true },
            });

            if (!owned) {
              if (operation === 'findUnique') {
                return null;
              }
              if (operation === 'upsert') {
                const nextArgs = applyTenantToArgs(
                  operation,
                  args as Record<string, unknown>,
                  tenantId,
                );
                return query(nextArgs);
              }
              throw notFound(model);
            }

            if (operation === 'upsert') {
              const nextArgs = applyTenantToArgs(
                operation,
                args as Record<string, unknown>,
                tenantId,
              );
              return query(nextArgs);
            }

            return query(args);
          }

          const nextArgs = applyTenantToArgs(
            operation,
            args as Record<string, unknown>,
            tenantId,
          );
          return query(nextArgs);
        },
      },
    },
  });
}

