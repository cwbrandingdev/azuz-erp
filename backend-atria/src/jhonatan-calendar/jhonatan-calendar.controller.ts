import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { getRequiredCrmPermissions } from '../auth/utils/rbac';
import {
  CreateJhonatanCalendarDto,
  QueryJhonatanCalendarDto,
} from './dto/jhonatan-calendar.dto';
import { JhonatanCalendarService } from './jhonatan-calendar.service';

@Controller('jhonatan-calendar')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AnyPermissions(...getRequiredCrmPermissions())
export class JhonatanCalendarController {
  constructor(
    private readonly jhonatanCalendarService: JhonatanCalendarService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryJhonatanCalendarDto,
  ) {
    return this.jhonatanCalendarService.findAll(user, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJhonatanCalendarDto,
  ) {
    return this.jhonatanCalendarService.create(user, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.jhonatanCalendarService.remove(user, id);
  }
}
