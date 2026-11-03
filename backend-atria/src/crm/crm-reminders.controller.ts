import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { ProspectingLeadsQueryDto } from './dto/prospecting-leads-query.dto';
import { UpdateCrmReminderDto } from './dto/update-crm-reminder.dto';

@Controller('crm/reminders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AnyPermissions(...getRequiredCrmPermissions())
export class CrmRemindersController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProspectingLeadsQueryDto,
  ) {
    return this.leadsService.findReminderBoard(user, query.ownerUserId);
  }

  @Patch(':id')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCrmReminderDto,
  ) {
    return this.leadsService.updateReminderStatus(user, id, dto.status);
  }
}
