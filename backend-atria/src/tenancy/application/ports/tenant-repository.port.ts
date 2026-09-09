import { Tenant } from '../../domain/tenant.entity';

export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');

export interface CreateTenantInput {
  id?: string;
  name: string;
  slug: string;
}

export interface TenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  create(data: CreateTenantInput): Promise<Tenant>;
}
