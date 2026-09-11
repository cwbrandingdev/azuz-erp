import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Permission } from '../auth/constants/permissions';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QueryFinanceDto } from './dto/query-finance.dto';
import { FinanceService } from './finance.service';

@Controller('api/finances')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleName.MASTER, RoleName.ADMIN)
@Permissions(Permission.FINANCE_ACCESS)
export class FinancesApiController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('due-today-alerts')
  getDueTodayAlerts(@CurrentUser() user: AuthenticatedUser) {
    return this.financeService.getDueTodayAlerts(user.userId);
  }

  @Get('monthly-cashflow')
  getMonthlyCashflow(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryFinanceDto,
  ) {
    return this.financeService.getMonthlyCashflow(user.userId, query);
  }
}
