import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AnyPermissions } from '../auth/decorators/any-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { getRequiredKanbanEditPermissions } from '../auth/utils/rbac';
import { CreationService } from './creation.service';
import {
  CreateBriefPlanDto,
  GenerateBriefPlanDto,
} from './dto/brief-to-content.dto';
import {
  CreateDeliverableDto,
  CreationDeliverableStatus,
  QueryClientPipelineDto,
  UpdateItemStatusDto,
} from './dto/deliverable.dto';
import { InternalReviewDto } from '../kanban/dto/internal-review.dto';

@Controller('creation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AnyPermissions(...getRequiredKanbanEditPermissions())
export class CreationController {
  constructor(private readonly creationService: CreationService) {}

  @Get('command-center')
  getCommandCenter() {
    return this.creationService.getCommandCenter();
  }

  @Get('pipeline')
  getClientPipeline(@Query() query: QueryClientPipelineDto) {
    return this.creationService.getClientPipeline(
      query.clientId,
      query.from,
      query.to,
    );
  }

  @Post('deliverables')
  createDeliverable(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeliverableDto,
  ) {
    return this.creationService.createDeliverable(user.userId, dto);
  }

  @Patch('pipeline/items/:source/:id/internal-review')
  updatePipelineInternalReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('source') source: 'post' | 'event',
    @Param('id') id: string,
    @Body() dto: InternalReviewDto,
  ) {
    return this.creationService.updatePipelineInternalReview(
      user.userId,
      user.role,
      source,
      id,
      dto,
    );
  }

  @Patch('pipeline/items/:source/:id/status')
  updateItemStatus(
    @Param('source') source: 'post' | 'event',
    @Param('id') id: string,
    @Body() dto: UpdateItemStatusDto,
  ) {
    return this.creationService.updateItemStatus(
      source,
      id,
      dto.status as CreationDeliverableStatus,
    );
  }

  @Post('brief-to-content/generate')
  generateFromBrief(@Body() dto: GenerateBriefPlanDto) {
    return this.creationService.generateFromBrief(dto);
  }

  @Post('brief-to-content/create')
  createFromBriefPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBriefPlanDto,
  ) {
    return this.creationService.createFromBriefPlan(user.userId, dto);
  }
}
