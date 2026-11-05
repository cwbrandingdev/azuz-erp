import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { QueryProductivityDto } from './dto/query-productivity.dto';
import { ProductivityService } from './productivity.service';

@Controller('productivity')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductivityController {
  constructor(private readonly productivityService: ProductivityService) {}

  @Get()
  @Roles(
    RoleName.MASTER,
    RoleName.ADMIN,
    RoleName.CRM,
    RoleName.DESIGNER_MASTER,
    RoleName.DESIGNER_JUNIOR,
  )
  getReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryProductivityDto,
  ) {
    return this.productivityService.getReport(user, query);
  }
}
