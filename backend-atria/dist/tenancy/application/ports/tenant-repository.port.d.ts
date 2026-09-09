import { Tenant } from '../../domain/tenant.entity';
export declare const TENANT_REPOSITORY: unique symbol;
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
