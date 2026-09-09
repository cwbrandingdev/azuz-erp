import { Inject, Injectable } from '@nestjs/common';
import type { Tenant } from '../domain/tenant.entity';
import {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_NAME,
  DEFAULT_TENANT_SLUG,
} from '../domain/tenant.constants';
import { TENANT_REPOSITORY } from './ports/tenant-repository.port';
import type { TenantRepository } from './ports/tenant-repository.port';

@Injectable()
export class TenantService {
  constructor(
    @Inject(TENANT_REPOSITORY)
    private readonly tenants: TenantRepository,
  ) {}

  findById(id: string): Promise<Tenant | null> {
    return this.tenants.findById(id);
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenants.findBySlug(slug);
  }

  async ensureDefaultTenant(): Promise<Tenant> {
    const existing = await this.tenants.findBySlug(DEFAULT_TENANT_SLUG);
    if (existing) {
      return existing;
    }

    const byId = await this.tenants.findById(DEFAULT_TENANT_ID);
    if (byId) {
      return byId;
    }

    return this.tenants.create({
      id: DEFAULT_TENANT_ID,
      name: DEFAULT_TENANT_NAME,
      slug: DEFAULT_TENANT_SLUG,
    });
  }
}
