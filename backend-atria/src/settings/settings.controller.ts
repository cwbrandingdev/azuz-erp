import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RoleName } from '@prisma/client';
import { Permission } from '../auth/constants/permissions';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateAppearanceDto } from './dto/appearance.dto';
import { UpdateBrandingDto } from './dto/branding.dto';
import { UpdateIntegrationsDto } from './dto/integrations.dto';
import { SettingsService } from './settings.service';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

const brandingUploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(new BadRequestException('Invalid image type'), false);
      return;
    }
    cb(null, true);
  },
});

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('branding')
  getBranding() {
    return this.settingsService.getBranding();
  }

  @Patch('branding')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  @Permissions(Permission.SETTINGS_MANAGE)
  updateBranding(@Body() dto: UpdateBrandingDto) {
    return this.settingsService.updateBranding(dto);
  }

  @Get('integrations')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  @Permissions(Permission.SETTINGS_MANAGE)
  getIntegrations() {
    return this.settingsService.getIntegrations();
  }

  @Patch('integrations')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  @Permissions(Permission.SETTINGS_MANAGE)
  updateIntegrations(@Body() dto: UpdateIntegrationsDto) {
    return this.settingsService.updateIntegrations(dto);
  }

  @Post('branding/upload')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(RoleName.MASTER, RoleName.ADMIN)
  @Permissions(Permission.SETTINGS_MANAGE)
  @UseInterceptors(brandingUploadInterceptor)
  uploadBrandingAsset(
    @Query('type') type: 'logo' | 'favicon',
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!type || !['logo', 'favicon'].includes(type)) {
      throw new BadRequestException('Query param type must be logo or favicon');
    }

    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.settingsService.uploadBrandingAsset(type, file);
  }

  @AllowAuthenticated()
  @Get('appearance')
  @UseGuards(JwtAuthGuard)
  getAppearance(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getAppearance(user.userId);
  }

  @AllowAuthenticated()
  @Patch('appearance')
  @UseGuards(JwtAuthGuard)
  updateAppearance(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAppearanceDto,
  ) {
    return this.settingsService.updateAppearance(user.userId, dto);
  }
}
