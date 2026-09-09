import {
  applyTenantToArgs,
  uniqueWhereToFilter,
} from './tenant-isolation';

describe('tenant isolation helpers', () => {
  const tenantId = 'tenant-a';

  it('flattens compound unique where into a filter', () => {
    expect(
      uniqueWhereToFilter({
        companyId_email: { companyId: 'c1', email: 'a@x.com' },
      }),
    ).toEqual({ companyId: 'c1', email: 'a@x.com' });
  });

  it('scopes list queries to the current tenant', () => {
    const args = applyTenantToArgs(
      'findMany',
      { where: { status: 'OPEN' } },
      tenantId,
    );

    expect(args.where).toEqual({
      AND: [{ status: 'OPEN' }, { tenantId }],
    });
  });

  it('forces tenantId on create payloads', () => {
    const args = applyTenantToArgs(
      'create',
      { data: { name: 'Lead', tenantId: 'other' } },
      tenantId,
    );

    expect(args.data).toEqual({ name: 'Lead', tenantId });
  });

  it('forces tenantId on createMany payloads', () => {
    const args = applyTenantToArgs(
      'createMany',
      { data: [{ name: 'A' }, { name: 'B', tenantId: 'other' }] },
      tenantId,
    );

    expect(args.data).toEqual([
      { name: 'A', tenantId },
      { name: 'B', tenantId },
    ]);
  });
});
