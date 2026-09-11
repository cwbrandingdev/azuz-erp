import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Permission } from '../auth/constants/permissions';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateClientBriefSlaDto, UpdateSlaSettingsDto } from './dto/sla.dto';
import { SlaService } from './sla.service';

@Controller('sla')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SlaController {
  constructor(private readonly slaService: SlaService) {}

  @Get('settings')
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  @Permissions(Permission.SETTINGS_MANAGE)
  getSettings() {
    return this.slaService.getSettings();
  }

  @Patch('settings')
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  @Permissions(Permission.SETTINGS_MANAGE)
  updateSettings(@Body() dto: UpdateSlaSettingsDto) {
    return this.slaService.updateSettings(dto);
  }

  @Get('dashboard')
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  getDashboard() {
    return this.slaService.getDashboard();
  }

  @Patch('briefs/:id')
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  updateBrief(@Param('id') id: string, @Body() dto: UpdateClientBriefSlaDto) {
    return this.slaService.updateBrief(id, dto);
  }
}
