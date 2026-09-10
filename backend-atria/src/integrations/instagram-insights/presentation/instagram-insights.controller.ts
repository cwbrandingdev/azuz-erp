import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CLIENT_LOOKUP_ROLES } from '../../../auth/constants/roles';
import { InstagramInsightsService } from '../application/instagram-insights.service';
import { QueryInstagramInsightsDto } from './dto/query-instagram-insights.dto';
import { QueryInstagramPeriodDto } from './dto/query-instagram-period.dto';

@Controller('instagram-insights')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CLIENT_LOOKUP_ROLES)
export class InstagramInsightsController {
  constructor(private readonly insights: InstagramInsightsService) {}

  @Get('conversations')
  listConversations(@Query() query: QueryInstagramPeriodDto) {
    return this.insights.listConversations({
      month: query.month,
      year: query.year,
    });
  }

  @Get('clients')
  listClients() {
    return this.insights.listClients();
  }

  @Get('clients/:clientId')
  getClientMetrics(
    @Param('clientId') clientId: string,
    @Query() query: QueryInstagramInsightsDto,
  ) {
    return this.insights.getClientMetrics(clientId, {
      contentType: query.contentType,
      month: query.month,
      year: query.year,
    });
  }
}
