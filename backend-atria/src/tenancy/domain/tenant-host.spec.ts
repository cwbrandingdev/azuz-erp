import {
  extractTenantSlug,
  isAllowedCorsOrigin,
  isTenantAwareCorsOrigin,
  parseBaseDomains,
  readExplicitTenantSlug,
  readHostHeader,
  TENANT_SLUG_HEADER,
} from './tenant-host';

describe('tenant host parsing', () => {
  const bases = ['atria.local', 'azuz.cwbranding.com.br'];

  it('extracts the slug from a local host with a port', () => {
    expect(extractTenantSlug('cwbranding.atria.local:3000', bases)).toBe(
      'cwbranding',
    );
  });

  it('extracts the slug from a production host', () => {
    expect(
      extractTenantSlug('cwbranding.azuz.cwbranding.com.br', bases),
    ).toBe('cwbranding');
  });

  it('prefers the longest matching base domain', () => {
    expect(
      extractTenantSlug('cwbranding.azuz.cwbranding.com.br', [
        'cwbranding.com.br',
        'azuz.cwbranding.com.br',
      ]),
    ).toBe('cwbranding');
  });

  it('returns null for apex hosts', () => {
    expect(extractTenantSlug('atria.local', bases)).toBeNull();
    expect(extractTenantSlug('azuz.cwbranding.com.br', bases)).toBeNull();
  });

  it('ignores localhost and raw IPs', () => {
    expect(extractTenantSlug('localhost:3001', bases)).toBeNull();
    expect(extractTenantSlug('127.0.0.1:3001', bases)).toBeNull();
  });

  it('ignores www as a tenant slug', () => {
    expect(extractTenantSlug('www.atria.local', bases)).toBeNull();
  });

  it('reads x-forwarded-host before host', () => {
    expect(
      readHostHeader({
        host: 'ignored.atria.local',
        'x-forwarded-host': 'cwbranding.atria.local:3000, other.example',
      }),
    ).toBe('cwbranding.atria.local:3000');
  });

  it('reads an explicit tenant slug header', () => {
    expect(
      readExplicitTenantSlug({
        [TENANT_SLUG_HEADER]: 'cwbranding',
        host: 'localhost:3001',
      }),
    ).toBe('cwbranding');
  });

  it('ignores an invalid explicit tenant slug header', () => {
    expect(
      readExplicitTenantSlug({
        [TENANT_SLUG_HEADER]: 'www',
        host: 'cwbranding.atria.local:3000',
      }),
    ).toBeNull();
  });

  it('allows CORS origins on tenant subdomains of configured bases', () => {
    expect(
      isTenantAwareCorsOrigin('http://cwbranding.atria.local:3000', bases),
    ).toBe(true);
    expect(
      isTenantAwareCorsOrigin('https://cwbranding.azuz.cwbranding.com.br', bases),
    ).toBe(true);
    expect(isTenantAwareCorsOrigin('http://atria.local:3000', bases)).toBe(
      true,
    );
    expect(
      isAllowedCorsOrigin(
        'http://evil.example',
        ['http://localhost:3000'],
        bases,
      ),
    ).toBe(false);
  });

  it('normalizes base domains from mixed env input', () => {
    expect(
      parseBaseDomains(' https://azuz.cwbranding.com.br/,.atria.local:3000 '),
    ).toEqual(['azuz.cwbranding.com.br', 'atria.local']);
  });
});
