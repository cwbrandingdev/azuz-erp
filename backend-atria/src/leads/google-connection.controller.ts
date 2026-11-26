import {
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleName } from '@prisma/client';
import type { Response } from 'express';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import { GoogleConnectionService } from './google-connection.service';
import { GoogleMeetService } from './google-meet.service';

@Controller('integrations/google')
export class GoogleConnectionController {
  private readonly logger = new Logger(GoogleConnectionController.name);

  constructor(
    private readonly connection: GoogleConnectionService,
    private readonly googleMeet: GoogleMeetService,
    private readonly configService: ConfigService,
  ) {}

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    this.assertOwnerCompany(user);
    return {
      ...(await this.connection.getDetails()),
      status: await this.googleMeet.checkConnection(),
    };
  }

  @Get('auth-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  getAuthorizationUrl(@CurrentUser() user: AuthenticatedUser) {
    this.assertOwnerCompany(user);
    return { url: this.connection.buildAuthorizationUrl(user.userId) };
  }

  // Pública porque quem chama é o navegador voltando do Google, sem o token de login.
  // A proteção é o "state" assinado.
  @Get('callback')
  @Public()
  async handleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() response: Response,
  ) {
    const result = await this.tryConnect(code, state);
    response.redirect(
      `${this.frontendUrl()}/settings/api-integrations?google=${result}`,
    );
  }

  private async tryConnect(code?: string, state?: string) {
    if (!code || !state) return 'error';

    try {
      await this.connection.connect(code, state);
      this.googleMeet.resetAccessToken();
      return 'connected';
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao conectar o Google Agenda: ${detail}`);
      return 'error';
    }
  }

  // A conexão é única para o sistema, então só a empresa principal pode alterá-la.
  private assertOwnerCompany(user: AuthenticatedUser) {
    if (user.companyId !== DEFAULT_COMPANY_ID) {
      throw new ForbiddenException(
        'Só a empresa principal gerencia o Google Agenda.',
      );
    }
  }

  private frontendUrl(): string {
    const url =
      this.configService.get<string>('FRONTEND_URL')?.trim() ||
      this.configService.get<string>('APP_URL')?.trim() ||
      'http://localhost:3000';
    return url.replace(/\/$/, '');
  }
}
