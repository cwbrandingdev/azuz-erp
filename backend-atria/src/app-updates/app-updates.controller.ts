import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateAppUpdateDto, UpdateAppUpdateDto } from './dto/app-update.dto';
import { AppUpdatesService } from './app-updates.service';

@Controller('app-updates')
@UseGuards(JwtAuthGuard)
@AllowAuthenticated()
export class AppUpdatesController {
  constructor(private readonly appUpdatesService: AppUpdatesService) {}

  @Get('access')
  getAccess(@CurrentUser() user: AuthenticatedUser) {
    return this.appUpdatesService.getAccess(
      user.userId,
      user.role,
      user.companyId,
    );
  }

  @Post('mark-read')
  markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.appUpdatesService.markAsRead(user.userId);
  }

  @Post(':id/mark-read')
  markOneAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.appUpdatesService.markOneAsRead(user.userId, id);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.appUpdatesService.findAll(
      user.userId,
      user.role,
      user.companyId,
    );
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleName.MASTER)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAppUpdateDto,
  ) {
    return this.appUpdatesService.create(user.userId, user.companyId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.MASTER)
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAppUpdateDto,
  ) {
    return this.appUpdatesService.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleName.MASTER)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appUpdatesService.remove(id, user.companyId);
  }
}
