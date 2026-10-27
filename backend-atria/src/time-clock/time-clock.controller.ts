import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { Request } from 'express';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateManualTimeClockEntryDto,
  PunchTimeClockDto,
  TimeClockListQueryDto,
  TimeClockRangeQueryDto,
  UpdateTimeClockEntryDto,
} from './dto/time-clock.dto';
import { extractPunchContext } from './punch-context';
import { TimeClockService } from './time-clock.service';

@Controller('time-clock')
@UseGuards(JwtAuthGuard)
export class TimeClockController {
  constructor(private readonly timeClockService: TimeClockService) {}

  @Post('punch')
  @AllowAuthenticated()
  punch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PunchTimeClockDto,
    @Req() request: Request,
  ) {
    return this.timeClockService.punch(
      user,
      dto.type,
      extractPunchContext(request),
    );
  }

  @Get('me')
  @AllowAuthenticated()
  getMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TimeClockRangeQueryDto,
  ) {
    return this.timeClockService.getMine(user, query);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MANAGER)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TimeClockListQueryDto,
  ) {
    return this.timeClockService.list(user, query);
  }

  @Post('entries')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MANAGER)
  createManual(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateManualTimeClockEntryDto,
  ) {
    return this.timeClockService.createManual(user, dto);
  }

  @Patch('entries/:id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MANAGER)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTimeClockEntryDto,
  ) {
    return this.timeClockService.update(user, id, dto);
  }
}
