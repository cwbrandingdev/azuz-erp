import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Tenant } from '../domain/tenant.entity';
import type {
  CreateTenantInput,
  TenantRepository,
} from '../application/ports/tenant-repository.port';

@Injectable()
export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { slug } });
  }

  create(data: CreateTenantInput): Promise<Tenant> {
    return this.prisma.tenant.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
      },
    });
  }
}
