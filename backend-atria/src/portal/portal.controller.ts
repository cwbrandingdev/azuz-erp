import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Throttle } from '@nestjs/throttler';
import { PUBLIC_THROTTLE } from '../auth/constants/throttle';
import { Public } from '../auth/decorators/public.decorator';
import { AssetsService } from '../assets/assets.service';
import { PortalBriefingDto, PortalRejectPostDto } from './dto/portal.dto';
import { PortalService } from './portal.service';

@Public()
@Throttle(PUBLIC_THROTTLE)
@Controller('portal')
export class PortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly assetsService: AssetsService,
  ) {}

  @Get(':token')
  getPortalData(@Param('token') token: string) {
    return this.portalService.getPortalData(token);
  }

  @Get(':token/finances')
  getPortalFinances(@Param('token') token: string) {
    return this.portalService.getClientFinancesByToken(token);
  }

  @Get(':token/reports/:reportId')
  getPortalReport(
    @Param('token') token: string,
    @Param('reportId') reportId: string,
  ) {
    return this.portalService.getPortalReport(token, reportId);
  }

  @Get(':token/posts/:postId')
  getPortalPost(
    @Param('token') token: string,
    @Param('postId') postId: string,
  ) {
    return this.portalService.getPortalPost(token, postId);
  }

  @Patch(':token/posts/:postId/approve')
  approvePost(
    @Param('token') token: string,
    @Param('postId') postId: string,
  ) {
    return this.portalService.approvePortalPost(token, postId);
  }

  @Patch(':token/posts/:postId/reject')
  rejectPost(
    @Param('token') token: string,
    @Param('postId') postId: string,
    @Body() dto: PortalRejectPostDto,
  ) {
    return this.portalService.rejectPortalPost(token, postId, dto);
  }

  @Get(':token/contracts/:contractId')
  getPortalContract(
    @Param('token') token: string,
    @Param('contractId') contractId: string,
  ) {
    return this.portalService.getPortalContract(token, contractId);
  }

  @Patch(':token/contracts/:contractId/sign')
  signContract(
    @Param('token') token: string,
    @Param('contractId') contractId: string,
  ) {
    return this.portalService.signPortalContract(token, contractId);
  }

  @Post(':token/assets/upload')
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
  uploadAsset(
    @Param('token') token: string,
    @Query('fileType') fileType: string | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.portalService.uploadPortalAsset(token, file, fileType);
  }

  @Post(':token/briefings')
  createBriefing(
    @Param('token') token: string,
    @Body() dto: PortalBriefingDto,
  ) {
    return this.portalService.createBriefing(token, dto);
  }
}
