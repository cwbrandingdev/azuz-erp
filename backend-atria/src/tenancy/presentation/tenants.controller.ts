import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { TenantService } from '../application/tenant.service';
import { isTenantSlug } from '../domain/tenant-host';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantService) {}

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const normalized = slug.trim().toLowerCase();
    if (!isTenantSlug(normalized)) {
      throw new NotFoundException('Tenant not found');
    }

    const tenant = await this.tenants.findBySlug(normalized);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return { slug: tenant.slug };
  }
}
