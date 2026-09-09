"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniqueWhereToFilter = uniqueWhereToFilter;
exports.applyTenantToArgs = applyTenantToArgs;
exports.isUniqueRead = isUniqueRead;
exports.isUniqueWrite = isUniqueWrite;
exports.toDelegateName = toDelegateName;
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
function uniqueWhereToFilter(where) {
    if (!where) {
        return {};
    }
    const filter = {};
    for (const [key, value] of Object.entries(where)) {
        if (value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            !(value instanceof Date)) {
            Object.assign(filter, value);
        }
        else {
            filter[key] = value;
        }
    }
    return filter;
}
function mergeWhere(where, tenantId) {
    if (!where || Object.keys(where).length === 0) {
        return { tenantId };
    }
    return { AND: [where, { tenantId }] };
}
function withTenantData(data, tenantId) {
    if (Array.isArray(data)) {
        return data.map((row) => row && typeof row === 'object'
            ? { ...row, tenantId }
            : row);
    }
    if (data && typeof data === 'object') {
        return { ...data, tenantId };
    }
    return data;
}
function applyTenantToArgs(operation, args, tenantId) {
    const next = { ...(args ?? {}) };
    if (FILTER_OPERATIONS.has(operation)) {
        next.where = mergeWhere(next.where, tenantId);
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
function isUniqueRead(operation) {
    return operation === 'findUnique' || operation === 'findUniqueOrThrow';
}
function isUniqueWrite(operation) {
    return operation === 'update' || operation === 'delete' || operation === 'upsert';
}
function toDelegateName(model) {
    return model.charAt(0).toLowerCase() + model.slice(1);
}
//# sourceMappingURL=tenant-isolation.js.map