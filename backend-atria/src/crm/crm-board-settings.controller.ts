import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AnyPermissions } from '../auth/decorators/any-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { getRequiredCrmPermissions } from '../auth/utils/rbac';
import { CrmScopeService } from '../leads/crm-scope.service';
import { LeadsService } from '../leads/leads.service';
import {
  CrmBoardSettingsQueryDto,
  UpdateCrmBoardSettingsDto,
} from './dto/update-crm-board-settings.dto';

@Controller('crm/board-settings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@AnyPermissions(...getRequiredCrmPermissions())
export class CrmBoardSettingsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly crmScope: CrmScopeService,
  ) {}

  @Get()
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CrmBoardSettingsQueryDto,
  ) {
    await this.assertOrganizationAccess(user, query.organizationId);
    return this.leadsService.getBoardSettings(user, query.organizationId);
  }

  @Patch()
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCrmBoardSettingsDto,
  ) {
    await this.assertOrganizationAccess(user, dto.organizationId);
    return this.leadsService.updateBoardSettings(user, dto);
  }

  private async assertOrganizationAccess(
    user: AuthenticatedUser,
    organizationId?: string | null,
  ) {
    if (!organizationId) return;
    await this.crmScope.assertUserCanManageOrganization(user, organizationId);
  }
}
