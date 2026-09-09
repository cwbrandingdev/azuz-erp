import type { Tenant } from '../domain/tenant.entity';
import type { TenantRepository } from './ports/tenant-repository.port';
export declare class TenantService {
    private readonly tenants;
    constructor(tenants: TenantRepository);
    findById(id: string): Promise<Tenant | null>;
    findBySlug(slug: string): Promise<Tenant | null>;
    ensureDefaultTenant(): Promise<Tenant>;
}
