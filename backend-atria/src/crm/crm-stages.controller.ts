import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import {
  CreateLeadStageDto,
  LeadStagesQueryDto,
  ReorderLeadStagesDto,
  UpdateLeadStageDto,
} from '../leads/dto/lead-stage.dto';
import { LeadStagesService } from '../leads/lead-stages.service';

@Controller('crm/stages')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@AnyPermissions(...getRequiredCrmPermissions())
export class CrmStagesController {
  constructor(
    private readonly leadStagesService: LeadStagesService,
    private readonly crmScope: CrmScopeService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LeadStagesQueryDto,
  ) {
    await this.assertOrganizationAccess(user, query.organizationId);
    return this.leadStagesService.findAll(query.organizationId);
  }

  @Post()
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeadStageDto,
  ) {
    await this.assertOrganizationAccess(user, dto.organizationId);
    return this.leadStagesService.create(dto);
  }

  @Patch('reorder')
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  async reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderLeadStagesDto,
  ) {
    await this.assertOrganizationAccess(user, dto.organizationId);
    return this.leadStagesService.reorder(dto);
  }

  @Patch(':id')
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeadStageDto,
  ) {
    await this.assertStageOrganizationAccess(user, id);
    return this.leadStagesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.assertStageOrganizationAccess(user, id);
    return this.leadStagesService.remove(id);
  }

  private async assertOrganizationAccess(
    user: AuthenticatedUser,
    organizationId?: string | null,
  ) {
    if (!organizationId) return;
    await this.crmScope.assertUserCanManageOrganization(user, organizationId);
  }

  private async assertStageOrganizationAccess(
    user: AuthenticatedUser,
    stageId: string,
  ) {
    const stage = await this.leadStagesService.getById(stageId);
    if (!stage.organizationId) return;
    await this.crmScope.assertUserCanManageOrganization(
      user,
      stage.organizationId,
    );
  }
}
