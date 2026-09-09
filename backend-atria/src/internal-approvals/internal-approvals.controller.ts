import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleName } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApproveInternalApprovalDto } from './dto/approve-internal-approval.dto';
import { RequestAdjustmentDto } from './dto/request-adjustment.dto';
import { InternalApprovalsService } from './internal-approvals.service';

@Controller('internal-approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.MASTER, RoleName.DESIGNER_MASTER)
export class InternalApprovalsController {
  constructor(
    private readonly internalApprovalsService: InternalApprovalsService,
  ) {}

  @Get()
  listPending(@CurrentUser() user: AuthenticatedUser) {
    return this.internalApprovalsService.listPending(user.role);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApproveInternalApprovalDto = {},
  ) {
    return this.internalApprovalsService.approve(
      id,
      user.userId,
      user.role,
      dto,
    );
  }

  @Post(':id/submit-delivery')
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
  submitDelivery(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    return this.internalApprovalsService.submitDelivery(
      id,
      user.userId,
      user.role,
      file,
      caption,
    );
  }

  @Post(':id/request-adjustment')
  requestAdjustment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestAdjustmentDto,
  ) {
    return this.internalApprovalsService.requestAdjustment(
      id,
      user.userId,
      user.role,
      dto,
    );
  }
}
