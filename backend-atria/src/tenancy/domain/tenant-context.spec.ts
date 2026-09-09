import { getCurrentTenantId, runWithTenant } from './tenant-context';

describe('tenant context', () => {
  it('exposes the tenant id inside the async store', () => {
    expect(getCurrentTenantId()).toBeUndefined();

    const value = runWithTenant('tenant-a', () => getCurrentTenantId());

    expect(value).toBe('tenant-a');
    expect(getCurrentTenantId()).toBeUndefined();
  });
});
