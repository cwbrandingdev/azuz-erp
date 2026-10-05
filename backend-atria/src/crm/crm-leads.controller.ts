import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnyPermissions } from '../auth/decorators/any-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { getRequiredCrmPermissions } from '../auth/utils/rbac';
import { LeadsService } from '../leads/leads.service';
import { CreateCrmLeadDto } from './dto/create-crm-lead.dto';
import { UpdateCrmLeadDto } from './dto/update-crm-lead.dto';
import { ProspectingLeadsQueryDto } from './dto/prospecting-leads-query.dto';
import { ToggleLeadCollapseDto } from './dto/toggle-lead-collapse.dto';
import { UpdateLeadStatusDto } from '../leads/dto/lead-kanban.dto';

@Controller('crm/leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AnyPermissions(...getRequiredCrmPermissions())
export class CrmLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.leadsService.findAllForCrm(user);
  }

  @Get('prospecting-leads')
  findProspectingLeads(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProspectingLeadsQueryDto,
  ) {
    return this.leadsService.findProspectingLeads(user, query.organizationId);
  }

  @Get('kanban')
  getKanbanBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProspectingLeadsQueryDto,
  ) {
    return this.leadsService.findKanbanBoard(user, query.organizationId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCrmLeadDto,
  ) {
    return this.leadsService.createForCrm(user, dto);
  }

  @Patch(':id/stage')
  updateStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateLeadStage(user, id, dto);
  }

  @Patch(':id/collapse')
  toggleCollapse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ToggleLeadCollapseDto,
  ) {
    return this.leadsService.toggleLeadCollapse(user, id, dto.isMinimized);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCrmLeadDto,
  ) {
    return this.leadsService.updateForCrm(user, id, dto);
  }
}
