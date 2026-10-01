import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { CLIENT_VIEW_AND_CREATE_ROLES } from '../../auth/constants/roles';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { MetaOAuthService } from './meta-oauth.service';

@Controller('integrations/meta/oauth')
export class MetaOAuthController {
  constructor(private readonly metaOAuth: MetaOAuthService) {}

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CLIENT_VIEW_AND_CREATE_ROLES)
  getConfig() {
    return {
      configured: this.metaOAuth.isConfigured(),
      scopes: this.metaOAuth.getRequiredScopes(),
    };
  }

  @Get('authorize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CLIENT_VIEW_AND_CREATE_ROLES)
  async authorize(@Query('clientId') clientId: string) {
    if (!clientId?.trim()) {
      return { url: null, error: 'clientId é obrigatório' };
    }
    const url = await this.metaOAuth.buildAuthorizationUrl(clientId.trim());
    return { url };
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    if (errorDescription) {
      return res.redirect(
        this.metaOAuth.buildFrontendErrorRedirect(errorDescription),
      );
    }

    if (!code || !state) {
      return res.redirect(
        this.metaOAuth.buildFrontendErrorRedirect(
          'Resposta OAuth incompleta do Meta',
        ),
      );
    }

    try {
      const result = await this.metaOAuth.completeAuthorization(code, state);
      return res.redirect(
        this.metaOAuth.buildFrontendSuccessRedirect(result.clientId),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha na conexão com o Meta';
      return res.redirect(this.metaOAuth.buildFrontendErrorRedirect(message));
    }
  }
}
