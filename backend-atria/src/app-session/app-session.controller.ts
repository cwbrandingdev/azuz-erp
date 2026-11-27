import { Controller, Get, UseGuards } from '@nestjs/common';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppSessionService } from './app-session.service';

@Controller('app')
@UseGuards(JwtAuthGuard)
@AllowAuthenticated()
export class AppSessionController {
  constructor(private readonly appSession: AppSessionService) {}

  @Get('session')
  getSession(@CurrentUser() user: AuthenticatedUser) {
    return this.appSession.getSession(user);
  }
}
