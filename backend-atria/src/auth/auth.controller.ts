import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  CurrentUser,
  type AuthenticatedUser,
} from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateInvitationTokenDto } from './dto/create-invitation-token.dto';
import { SignupWithTokenDto } from './dto/signup-with-token.dto';
import { ValidateInvitationTokenDto } from './dto/validate-invitation-token.dto';
import { RoleName } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { Permission } from './constants/permissions';
import { AUTH_THROTTLE } from './constants/throttle';
import { AllowAuthenticated } from './decorators/allow-authenticated.decorator';
import { Permissions } from './decorators/permissions.decorator';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';

const REFRESH_TOKEN_COOKIE = 'atria_refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('signup-with-token')
  async signupWithToken(
    @Body() dto: SignupWithTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signupWithToken(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Get('invitation-tokens/validate')
  validateInvitationToken(@Query() dto: ValidateInvitationTokenDto) {
    return this.authService.validateInvitationToken(dto.token);
  }

  @Post('invitation-tokens')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  @Permissions(Permission.INVITATIONS_MANAGE)
  createInvitationToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvitationTokenDto,
  ) {
    return this.authService.createInvitationToken(user.userId, dto);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.GONE)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      req.cookies?.[REFRESH_TOKEN_COOKIE] ?? dto?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const result = await this.authService.refresh(refreshToken);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      req.cookies?.[REFRESH_TOKEN_COOKIE] ?? dto?.refreshToken;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.clearRefreshTokenCookie(res);
  }

  @AllowAuthenticated()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.userId);
  }

  @AllowAuthenticated()
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, dto);
  }

  private getRefreshCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = this.configService.get<string>('COOKIE_DOMAIN')?.trim();

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, this.getRefreshCookieOptions());
  }

  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie(REFRESH_TOKEN_COOKIE, this.getRefreshCookieOptions());
  }
}
