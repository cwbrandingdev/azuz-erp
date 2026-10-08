import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { AnyPermissions } from '../auth/decorators/any-permissions.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { getRequiredKanbanEditPermissions } from '../auth/utils/rbac';
import { UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES } from '../common/upload/upload-limits';
import { ValidateUploadFileSizePipe } from '../common/upload/validate-upload-file-size.pipe';
import { AssetsService } from './assets.service';
import { CreateAssetDto, QueryAssetsDto } from './dto/asset.dto';

@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@AnyPermissions(...getRequiredKanbanEditPermissions())
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(@Query() query: QueryAssetsDto) {
    return this.assetsService.findAll(query);
  }

  @Get('grouped')
  findGrouped() {
    return this.assetsService.findByClientGrouped();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = join(process.cwd(), 'uploads');
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const unique = `${randomUUID()}${extname(file.originalname)}`;
          cb(null, unique);
        },
      }),
      limits: { fileSize: UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssetDto,
    @UploadedFile(ValidateUploadFileSizePipe) file: Express.Multer.File,
  ) {
    return this.assetsService.upload(user.userId, dto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetsService.remove(id);
  }
}
