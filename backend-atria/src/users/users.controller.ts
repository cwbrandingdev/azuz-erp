import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/permissions';
import {
  INTERNAL_STAFF_ROLES,
  USER_MANAGEMENT_ROLES,
  CLIENT_DIRECTORY_ROLES,
} from '../auth/constants/roles';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProvisionUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

const MEMBER_ROLES = [...INTERNAL_STAFF_ROLES] as const;

const avatarUploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(
        new BadRequestException(
          'Tipo de imagem inválido. Use PNG, JPG ou WEBP.',
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },
});

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(...USER_MANAGEMENT_ROLES)
  @Permissions(Permission.USERS_MANAGE)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('members')
  @Roles(...MEMBER_ROLES)
  findMembers() {
    return this.usersService.findMembers();
  }

  @Get('clients')
  @Roles(...CLIENT_DIRECTORY_ROLES)
  findClients() {
    return this.usersService.findClients();
  }

  @Get('representatives')
  @Roles(...USER_MANAGEMENT_ROLES)
  findRepresentatives() {
    return this.usersService.findRepresentatives();
  }

  @Post('provision')
  @Roles(...USER_MANAGEMENT_ROLES)
  @Permissions(Permission.USERS_MANAGE)
  provision(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ProvisionUserDto,
  ) {
    return this.usersService.provision(dto, user.userId);
  }

  @AllowAuthenticated()
  @Post('me/avatar')
  @UseInterceptors(avatarUploadInterceptor)
  async uploadMyAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatório');
    }
    return this.usersService.uploadAvatar(user.userId, file);
  }

  @AllowAuthenticated()
  @Post('me/avatar/remove')
  removeMyAvatar(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.removeAvatar(user.userId);
  }

  @Post(':id/avatar')
  @Roles(...USER_MANAGEMENT_ROLES)
  @Permissions(Permission.USERS_MANAGE)
  @UseInterceptors(avatarUploadInterceptor)
  async uploadUserAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatório');
    }
    return this.usersService.uploadAvatar(id, file);
  }

  @Patch(':id/deactivate')
  @Roles(...USER_MANAGEMENT_ROLES)
  @Permissions(Permission.USERS_DEACTIVATE)
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @Patch(':id')
  @Roles(...USER_MANAGEMENT_ROLES)
  @Permissions(Permission.USERS_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}
