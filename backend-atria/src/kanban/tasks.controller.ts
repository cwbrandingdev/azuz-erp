import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { KANBAN_TASK_CREATE_ROLES } from '../auth/constants/roles';
import { AnyPermissions } from '../auth/decorators/any-permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { getRequiredKanbanEditPermissions } from '../auth/utils/rbac';
import { CreateTaskDto, QueryTasksDto, UpdateTaskStatusDto } from './dto/task.dto';
import { KanbanService } from './kanban.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@AnyPermissions(...getRequiredKanbanEditPermissions())
export class TasksController {
  constructor(private readonly kanbanService: KanbanService) {}

  @Get()
  getTasks(@Query() query: QueryTasksDto) {
    return this.kanbanService.getTasks(query);
  }

  @Get(':id')
  getTask(@Param('id') id: string) {
    return this.kanbanService.getTask(id);
  }

  @Post()
  @Roles(...KANBAN_TASK_CREATE_ROLES)
  createTask(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.kanbanService.createTask(user.userId, dto);
  }

  @Patch(':id/status')
  @HttpCode(200)
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.kanbanService.updateTaskStatus(user.userId, user.role, id, dto);
  }
}
