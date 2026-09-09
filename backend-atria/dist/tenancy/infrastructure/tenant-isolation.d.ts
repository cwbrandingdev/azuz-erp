export declare function uniqueWhereToFilter(where: Record<string, unknown> | undefined): Record<string, unknown>;
export declare function applyTenantToArgs(operation: string, args: Record<string, unknown> | undefined, tenantId: string): Record<string, unknown>;
export declare function isUniqueRead(operation: string): boolean;
export declare function isUniqueWrite(operation: string): boolean;
export declare function toDelegateName(model: string): string;
