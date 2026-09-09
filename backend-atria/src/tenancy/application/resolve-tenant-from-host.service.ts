import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Tenant } from '../domain/tenant.entity';
import {
  extractTenantSlug,
  parseBaseDomains,
  readExplicitTenantSlug,
  readHostHeader,
} from '../domain/tenant-host';
import { TenantService } from './tenant.service';

export type HostTenantResolution =
  | { kind: 'none' }
  | { kind: 'unknown'; slug: string }
  | { kind: 'found'; tenant: Tenant };

@Injectable()
export class ResolveTenantFromHostService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tenants: TenantService,
  ) {}

  resolveSlug(
    headers: Record<string, string | string[] | undefined>,
  ): string | null {
    return (
      readExplicitTenantSlug(headers) ??
      extractTenantSlug(readHostHeader(headers), this.baseDomains())
    );
  }

  async resolve(
    headers: Record<string, string | string[] | undefined>,
  ): Promise<HostTenantResolution> {
    const slug = this.resolveSlug(headers);
    if (!slug) {
      return { kind: 'none' };
    }

    const tenant = await this.tenants.findBySlug(slug);
    if (!tenant) {
      return { kind: 'unknown', slug };
    }

    return { kind: 'found', tenant };
  }

  async resolveOrThrow(
    headers: Record<string, string | string[] | undefined>,
  ): Promise<Tenant | undefined> {
    const resolution = await this.resolve(headers);
    if (resolution.kind === 'none') {
      return undefined;
    }
    if (resolution.kind === 'unknown') {
      throw new NotFoundException('Tenant not found');
    }
    return resolution.tenant;
  }

  private baseDomains(): string[] {
    return parseBaseDomains(
      this.configService.get<string>('TENANT_BASE_DOMAINS') ?? '',
    );
  }
}
