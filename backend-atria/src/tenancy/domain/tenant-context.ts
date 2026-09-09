import { AsyncLocalStorage } from 'async_hooks';

const tenantStorage = new AsyncLocalStorage<string>();

export function getCurrentTenantId(): string | undefined {
  return tenantStorage.getStore();
}

export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return tenantStorage.run(tenantId, fn);
}

export function enterTenant(tenantId: string): void {
  tenantStorage.enterWith(tenantId);
}
