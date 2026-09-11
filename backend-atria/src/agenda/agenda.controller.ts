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
import { AnyPermissions } from '../auth/decorators/any-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { getRequiredCalendarEditPermissions } from '../auth/utils/rbac';
import { AgendaService } from './agenda.service';
import {
  ConfirmAgendaEventDto,
  CreateAgendaEventDto,
  QueryAgendaEventsDto,
  UpdateAgendaEventDto,
} from './dto/agenda-event.dto';

@Controller('agenda-events')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AnyPermissions(...getRequiredCalendarEditPermissions())
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  findAll(@Query() query: QueryAgendaEventsDto) {
    return this.agendaService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agendaService.findOne(id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAgendaEventDto,
  ) {
    return this.agendaService.create(user.userId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAgendaEventDto) {
    return this.agendaService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agendaService.remove(id);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() dto: ConfirmAgendaEventDto) {
    return this.agendaService.confirm(id, dto);
  }

  @Delete(':id/confirm/:userId')
  removeConfirmation(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.agendaService.removeConfirmation(id, userId);
  }
}
