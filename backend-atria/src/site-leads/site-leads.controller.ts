import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SiteLeadsService } from './site-leads.service';

// O RolesGuard sempre deixa o MASTER passar, então ADMIN aqui = master e admin.
@Controller('site-leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
export class SiteLeadsController {
  constructor(private readonly siteLeadsService: SiteLeadsService) {}

  @Get()
  list() {
    return this.siteLeadsService.listLeads();
  }
}
