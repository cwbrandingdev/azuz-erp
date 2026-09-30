import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Permission } from '../auth/constants/permissions';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanySettingsService } from './company-settings.service';
import { ResolveMetaPageAccessTokenDto } from './dto/resolve-meta-page-access-token.dto';
import { UpdateCompanyIntegrationsDto } from './dto/update-company-integrations.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Controller('api/company')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleName.MASTER, RoleName.ADMIN)
@Permissions(Permission.SETTINGS_MANAGE)
export class CompanySettingsController {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  @Get('settings')
  getSettings() {
    return this.companySettingsService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateCompanySettingsDto) {
    return this.companySettingsService.updateSettings(dto);
  }

  @Get('integrations')
  getIntegrations() {
    return this.companySettingsService.getIntegrations();
  }

  @Patch('integrations')
  updateIntegrations(@Body() dto: UpdateCompanyIntegrationsDto) {
    return this.companySettingsService.updateIntegrations(dto);
  }

  @Post('integrations/resolve-meta-page-token')
  resolveMetaPageAccessToken(@Body() dto: ResolveMetaPageAccessTokenDto) {
    return this.companySettingsService.resolveMetaPageAccessToken(dto);
  }
}
