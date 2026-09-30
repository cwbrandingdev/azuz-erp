import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles(
    RoleName.MASTER,
    RoleName.ADMIN,
    RoleName.DESIGNER_MASTER,
    RoleName.DESIGNER_JUNIOR,
  )
  getOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getOverview(user.userId, user.role);
  }

  @Get('tv-monitoring')
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  getTvMonitoring() {
    return this.dashboardService.getTvMonitoring();
  }
}
