import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AnyPermissions } from '../auth/decorators/any-permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { KANBAN_TASK_CREATE_ROLES } from '../auth/constants/roles';
import { getRequiredKanbanEditPermissions } from '../auth/utils/rbac';
import { CreateCommentDto } from './dto/comment.dto';
import {
  CreateColumnDto,
  ReorderColumnsDto,
  UpdateColumnDto,
} from './dto/column.dto';
import { InternalReviewDto } from './dto/internal-review.dto';
import { QueryDeletionHistoryDto } from './dto/deletion-history.dto';
import {
  BulkDeleteTaskAssetsDto,
  CreateTaskDto,
  MoveTaskDto,
  QueryTasksDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
} from './dto/task.dto';
import { KanbanService } from './kanban.service';

@Controller('kanban')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@AnyPermissions(...getRequiredKanbanEditPermissions())
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  @Get('deletion-history')
  getDeletionHistory(@Query() query: QueryDeletionHistoryDto) {
    return this.kanbanService.getDeletionHistory(query);
  }

  @Delete('tasks/clear')
  clearTasks(@CurrentUser() user: AuthenticatedUser) {
    return this.kanbanService.clearAllTasks(user.userId, user.role);
  }

  @Get('columns')
  getColumns() {
    return this.kanbanService.getColumns();
  }

  @Post('columns')
  createColumn(@Body() dto: CreateColumnDto) {
    return this.kanbanService.createColumn(dto);
  }

  @Patch('columns/reorder')
  reorderColumns(@Body() dto: ReorderColumnsDto) {
    return this.kanbanService.reorderColumns(dto);
  }

  @Patch('columns/:id')
  updateColumn(@Param('id') id: string, @Body() dto: UpdateColumnDto) {
    return this.kanbanService.updateColumn(id, dto);
  }

  @Delete('columns/:id')
  deleteColumn(@Param('id') id: string) {
    return this.kanbanService.deleteColumn(id);
  }

  @Get('tasks')
  getTasks(@Query() query: QueryTasksDto) {
    return this.kanbanService.getTasks(query);
  }

  @Get('tasks/:id')
  getTask(@Param('id') id: string) {
    return this.kanbanService.getTask(id);
  }

  @Post('tasks')
  @Roles(...KANBAN_TASK_CREATE_ROLES)
  createTask(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.kanbanService.createTask(user.userId, dto);
  }

  @Patch('tasks/:id/assign')
  assignTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.kanbanService.updateTask(user.userId, user.role, id, dto);
  }

  @Patch('tasks/:id')
  updateTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.kanbanService.updateTask(user.userId, user.role, id, dto);
  }

  @Patch('tasks/:id/status')
  @HttpCode(200)
  updateTaskStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.kanbanService.updateTaskStatus(user.userId, user.role, id, dto);
  }

  @Patch('tasks/:id/move')
  moveTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MoveTaskDto,
  ) {
    return this.kanbanService.moveTask(user.userId, user.role, id, dto);
  }

  @Patch('tasks/:id/internal-review')
  updateInternalReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: InternalReviewDto,
  ) {
    return this.kanbanService.updateInternalReview(user.userId, user.role, id, dto);
  }

  @Post('tasks/:id/assets')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, join(process.cwd(), 'uploads'));
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  uploadTaskAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    return this.kanbanService.uploadTaskAsset(user.userId, user.role, id, file, caption);
  }

  @Post('tasks/:id/assets/bulk-delete')
  @HttpCode(200)
  bulkDeleteTaskAssets(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: BulkDeleteTaskAssetsDto,
  ) {
    return this.kanbanService.bulkDeleteTaskAssets(
      user.userId,
      user.role,
      id,
      dto.assetIds,
    );
  }

  @Delete('tasks/:id/assets/:assetId')
  deleteTaskAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('assetId') assetId: string,
  ) {
    return this.kanbanService.deleteTaskAsset(user.userId, user.role, id, assetId);
  }

  @Delete('tasks/:id')
  deleteTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.kanbanService.deleteTask(user.userId, user.role, id);
  }

  @Get('tasks/:id/comments')
  getComments(@Param('id') id: string) {
    return this.kanbanService.getComments(id);
  }

  @Post('tasks/:id/comments')
  createComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.kanbanService.createComment(user.userId, id, dto);
  }

  @Get('tasks/:id/history')
  getHistory(@Param('id') id: string) {
    return this.kanbanService.getHistory(id);
  }
}
