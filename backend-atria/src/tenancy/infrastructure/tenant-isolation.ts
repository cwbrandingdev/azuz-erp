const FILTER_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'updateManyAndReturn',
  'deleteMany',
]);

const CREATE_OPERATIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
]);

export function uniqueWhereToFilter(
  where: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!where) {
    return {};
  }

  const filter: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(where)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      Object.assign(filter, value as Record<string, unknown>);
    } else {
      filter[key] = value;
    }
  }
  return filter;
}

function mergeWhere(
  where: Record<string, unknown> | undefined,
  tenantId: string,
): Record<string, unknown> {
  if (!where || Object.keys(where).length === 0) {
    return { tenantId };
  }
  return { AND: [where, { tenantId }] };
}

function withTenantData(data: unknown, tenantId: string): unknown {
  if (Array.isArray(data)) {
    return data.map((row) =>
      row && typeof row === 'object'
        ? { ...(row as Record<string, unknown>), tenantId }
        : row,
    );
  }
  if (data && typeof data === 'object') {
    return { ...(data as Record<string, unknown>), tenantId };
  }
  return data;
}

export function applyTenantToArgs(
  operation: string,
  args: Record<string, unknown> | undefined,
  tenantId: string,
): Record<string, unknown> {
  const next = { ...(args ?? {}) };

  if (FILTER_OPERATIONS.has(operation)) {
    next.where = mergeWhere(next.where as Record<string, unknown> | undefined, tenantId);
    return next;
  }

  if (CREATE_OPERATIONS.has(operation)) {
    next.data = withTenantData(next.data, tenantId);
    return next;
  }

  if (operation === 'upsert') {
    next.create = withTenantData(next.create, tenantId);
    next.update = withTenantData(next.update, tenantId);
    return next;
  }

  return next;
}

export function isUniqueRead(operation: string): boolean {
  return operation === 'findUnique' || operation === 'findUniqueOrThrow';
}

export function isUniqueWrite(operation: string): boolean {
  return operation === 'update' || operation === 'delete' || operation === 'upsert';
}

export function toDelegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}
