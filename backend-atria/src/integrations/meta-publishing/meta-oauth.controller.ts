import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CLIENT_VIEW_AND_CREATE_ROLES } from '../../auth/constants/roles';
import { Public } from '../../auth/decorators/public.decorator';
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
    const url = await this.metaOAuth.buildAuthorizationUrl(clientId);
    return { url };
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    if (error) {
      return res.redirect(
        this.metaOAuth.buildFrontendErrorRedirect(
          errorDescription || error || 'Autorização cancelada',
        ),
      );
    }

    try {
      const result = await this.metaOAuth.completeAuthorization(code, state);
      return res.redirect(this.metaOAuth.buildFrontendSuccessRedirect(result.clientId));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Falha na conexão com o Meta';
      return res.redirect(this.metaOAuth.buildFrontendErrorRedirect(message));
    }
  }
}
