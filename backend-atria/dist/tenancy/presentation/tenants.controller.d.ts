import { TenantService } from '../application/tenant.service';
export declare class TenantsController {
    private readonly tenants;
    constructor(tenants: TenantService);
    findBySlug(slug: string): Promise<{
        slug: string;
    }>;
}
