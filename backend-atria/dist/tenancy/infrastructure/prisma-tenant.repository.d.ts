import { PrismaService } from '../../prisma/prisma.service';
import type { Tenant } from '../domain/tenant.entity';
import type { CreateTenantInput, TenantRepository } from '../application/ports/tenant-repository.port';
export declare class PrismaTenantRepository implements TenantRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<Tenant | null>;
    findBySlug(slug: string): Promise<Tenant | null>;
    create(data: CreateTenantInput): Promise<Tenant>;
}
