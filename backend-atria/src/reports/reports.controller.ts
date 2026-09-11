import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PortalService } from '../portal/portal.service';
import { GenerateReportDto, QueryReportsDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.MASTER, RoleName.ADMIN)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly portalService: PortalService,
  ) {}

  @Get()
  findAll(@Query() query: QueryReportsDto) {
    return this.reportsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Post('generate/:clientId')
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('clientId') clientId: string,
    @Body() dto: GenerateReportDto,
  ) {
    return this.reportsService.generateReport(user.userId, clientId, dto);
  }

  @Post('portal-token/:clientId')
  generatePortalToken(@Param('clientId') clientId: string) {
    return this.portalService.generatePortalToken(clientId);
  }
}
