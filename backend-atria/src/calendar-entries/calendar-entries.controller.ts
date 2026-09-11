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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { getRequiredCalendarEditPermissions } from '../auth/utils/rbac';
import { CalendarEntriesService } from './calendar-entries.service';
import {
  CreateCalendarEntryDto,
  QueryCalendarEntriesDto,
  UpdateCalendarEntryDto,
} from './dto/calendar-entry.dto';

@Controller('calendar-entries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AnyPermissions(...getRequiredCalendarEditPermissions())
export class CalendarEntriesController {
  constructor(
    private readonly calendarEntriesService: CalendarEntriesService,
  ) {}

  @Get()
  findAll(@Query() query: QueryCalendarEntriesDto) {
    return this.calendarEntriesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.calendarEntriesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCalendarEntryDto) {
    return this.calendarEntriesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCalendarEntryDto) {
    return this.calendarEntriesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.calendarEntriesService.remove(id);
  }
}
