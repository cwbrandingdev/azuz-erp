import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CLIENT_DIRECTORY_ROLES } from '../auth/constants/roles';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClientRequestsService } from './client-requests.service';
import {
  CreateClientRequestCommentDto,
  CreateClientRequestDto,
  ConvertClientRequestToTaskDto,
  QueryClientRequestsDto,
  UpdateClientRequestDto,
} from './dto/client-request.dto';

@Controller('client-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CLIENT_DIRECTORY_ROLES)
export class ClientRequestsController {
  constructor(private readonly clientRequestsService: ClientRequestsService) {}

  @Get()
  findAll(@Query() query: QueryClientRequestsDto) {
    return this.clientRequestsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientRequestsService.findOne(id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClientRequestDto,
  ) {
    return this.clientRequestsService.create(dto, {
      companyId: user.companyId ?? undefined,
      authorId: user.userId,
    });
  }

  @Post(':id/comments')
  addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateClientRequestCommentDto,
  ) {
    return this.clientRequestsService.addComment(id, user.userId, dto);
  }

  @Post(':id/convert-to-task')
  convertToTask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ConvertClientRequestToTaskDto,
  ) {
    return this.clientRequestsService.convertToTask(id, user.userId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientRequestDto) {
    return this.clientRequestsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientRequestsService.remove(id);
  }
}
