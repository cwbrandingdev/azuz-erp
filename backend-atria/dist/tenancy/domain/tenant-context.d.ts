export declare function getCurrentTenantId(): string | undefined;
export declare function runWithTenant<T>(tenantId: string, fn: () => T): T;
export declare function enterTenant(tenantId: string): void;
