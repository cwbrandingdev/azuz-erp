import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StudioService } from './studio.service';

@Controller('studio')
@UseGuards(JwtAuthGuard, RolesGuard)
@AllowAuthenticated()
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  @Get('home')
  @Roles(RoleName.DESIGNER_MASTER, RoleName.DESIGNER_JUNIOR)
  getHome(@CurrentUser() user: AuthenticatedUser) {
    return this.studioService.getHome(user.userId);
  }
}