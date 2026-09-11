import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { RoleName } from '@prisma/client';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { DELIVERABLE_ACCESS_ROLES } from '../auth/constants/roles';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RejectClientDeliverableDto } from './dto/client-review.dto';
import { RevisionDeliverableItemDto } from './dto/revision-item.dto';
import { DeliverablesService } from './deliverables.service';

const DELIVERABLE_SUBMISSION_ROLES = [
  RoleName.MASTER,
  RoleName.ADMIN,
  RoleName.DESIGNER_MASTER,
  RoleName.DESIGNER_JUNIOR,
] as const;

@Controller('deliverables')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...DELIVERABLE_ACCESS_ROLES)
export class DeliverablesController {
  constructor(private readonly deliverablesService: DeliverablesService) {}

  @Post('items/:itemId/revision')
  reviseItemPost(
    @Param('itemId') itemId: string,
    @Body() dto: RevisionDeliverableItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviseItem(itemId, dto, user);
  }

  @Patch('items/:itemId/revision')
  reviseItem(
    @Param('itemId') itemId: string,
    @Body() dto: RevisionDeliverableItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliverablesService.reviseItem(itemId, dto, user.userId);
  }

  @Get('items/:itemId/download')
  async downloadItem(
    @Param('itemId') itemId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const payload = await this.deliverablesService.getDownload(itemId);

    if (
      payload.source === 'local' &&
      'streamPath' in payload &&
      payload.streamPath
    ) {
      res.setHeader('Content-Disposition', payload.contentDisposition);
      res.setHeader('Content-Type', 'application/octet-stream');
      return new StreamableFile(
        this.deliverablesService.openLocalFileStream(payload.streamPath),
      );
    }

    return {
      itemId: payload.itemId,
      fileName: payload.fileName,
      mediaType: payload.mediaType,
      downloadUrl: payload.downloadUrl,
      expiresAt: payload.expiresAt,
      contentDisposition: payload.contentDisposition,
      source: payload.source,
    };
  }

  @Post(':id/submit')
  @Roles(...DELIVERABLE_SUBMISSION_ROLES)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, join(process.cwd(), 'uploads'));
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  submit(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    return this.deliverablesService.submit(id, user.userId, user.role, file, caption);
  }

  @Post(':id/approve-internal')
  @Roles(RoleName.MASTER)
  approveInternal(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliverablesService.approveInternal(
      id,
      user.userId,
      user.role,
    );
  }

  @Post(':id/reject-client')
  rejectClient(
    @Param('id') id: string,
    @Body() dto: RejectClientDeliverableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliverablesService.rejectClient(id, dto, user.userId);
  }

  @Post(':id/approve-client')
  approveClient(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliverablesService.approveClient(id, user.userId);
  }

  @Get(':id/full-view')
  getFullView(@Param('id') id: string) {
    return this.deliverablesService.getFullView(id);
  }
}
