import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Throttle } from '@nestjs/throttler';
import { AUTH_THROTTLE } from '../auth/constants/throttle';
import { USER_MANAGEMENT_ROLES } from '../auth/constants/roles';
import { PortalAuthenticated } from '../auth/decorators/portal-authenticated.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClientPortalFinancialService } from '../client-portal-financial/client-portal-financial.service';
import { CreateClientFinancialAttachmentDto } from '../client-portal-financial/dto/create-client-financial-attachment.dto';
import { AssetsService } from '../assets/assets.service';
import { ClientRequestsService } from '../client-requests/client-requests.service';
import {
  CreateClientRequestCommentDto,
  CreateClientRequestDto,
  QueryClientRequestsDto,
} from '../client-requests/dto/client-request.dto';
import { DeliverablesService } from '../deliverables/deliverables.service';
import { QueryClientDeliverablesDto } from '../deliverables/dto/query-client-deliverables.dto';
import { RejectClientDeliverableDto } from '../deliverables/dto/client-review.dto';
import { RevisionDeliverableItemDto } from '../deliverables/dto/revision-item.dto';
import { PortalBriefingDto, PortalRejectPostDto } from './dto/portal.dto';
import { ProvisionPortalAccessDto, PortalLoginDto } from './dto/portal-auth.dto';
import { PortalAuthGuard } from './guards/portal-auth.guard';
import { PortalAuthService } from './portal-auth.service';
import { PortalService } from './portal.service';

interface PortalRequest {
  portalUser: { id: string; clientId: string; email: string };
}

@Controller('portal/session')
@UseGuards(PortalAuthGuard)
@PortalAuthenticated()
export class PortalSessionController {
  constructor(
    private readonly portalService: PortalService,
    private readonly assetsService: AssetsService,
    private readonly clientRequestsService: ClientRequestsService,
    private readonly deliverablesService: DeliverablesService,
    private readonly financialService: ClientPortalFinancialService,
  ) {}

  @Get()
  getPortalData(@Req() req: PortalRequest) {
    return this.portalService.getPortalDataForClient(req.portalUser.clientId);
  }

  @Get('finances')
  getFinances(@Req() req: PortalRequest) {
    return this.portalService.getClientFinancesForClient(req.portalUser.clientId);
  }

  @Get('calendar')
  getCalendar(
    @Req() req: PortalRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.portalService.getClientPortalCalendar(
      req.portalUser.clientId,
      from,
      to,
    );
  }

  @Get('reports/:reportId')
  getPortalReport(
    @Req() req: PortalRequest,
    @Param('reportId') reportId: string,
  ) {
    return this.portalService.getPortalReportForClient(
      req.portalUser.clientId,
      reportId,
    );
  }

  @Get('posts/:postId')
  getPortalPost(@Req() req: PortalRequest, @Param('postId') postId: string) {
    return this.portalService.getPortalPostForClient(
      req.portalUser.clientId,
      postId,
    );
  }

  @Patch('posts/:postId/approve')
  approvePost(@Req() req: PortalRequest, @Param('postId') postId: string) {
    return this.portalService.approvePortalPostForClient(
      req.portalUser.clientId,
      postId,
    );
  }

  @Patch('posts/:postId/reject')
  rejectPost(
    @Req() req: PortalRequest,
    @Param('postId') postId: string,
    @Body() dto: PortalRejectPostDto,
  ) {
    return this.portalService.rejectPortalPostForClient(
      req.portalUser.clientId,
      postId,
      dto,
    );
  }

  @Get('contracts/:contractId')
  getPortalContract(
    @Req() req: PortalRequest,
    @Param('contractId') contractId: string,
  ) {
    return this.portalService.getPortalContractForClient(
      req.portalUser.clientId,
      contractId,
    );
  }

  @Patch('contracts/:contractId/sign')
  signContract(
    @Req() req: PortalRequest,
    @Param('contractId') contractId: string,
  ) {
    return this.portalService.signPortalContractForClient(
      req.portalUser.clientId,
      contractId,
    );
  }

  @Post('assets/upload')
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
    @Req() req: PortalRequest,
    @Query('fileType') fileType: string | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.portalService.uploadPortalAssetForClient(
      req.portalUser.clientId,
      file,
      fileType,
    );
  }

  @Post('briefings')
  createBriefing(
    @Req() req: PortalRequest,
    @Body() dto: PortalBriefingDto,
  ) {
    return this.portalService.createBriefingForClient(
      req.portalUser.clientId,
      dto,
    );
  }

  @Get('financial/attachments')
  listFinancialAttachments(@Req() req: PortalRequest) {
    return this.financialService.listForClient(req.portalUser.clientId);
  }

  @Post('financial/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  uploadFinancialAttachment(
    @Req() req: PortalRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateClientFinancialAttachmentDto,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatório');
    }
    return this.financialService.uploadForClient(
      req.portalUser.clientId,
      dto,
      file,
    );
  }

  @Get('requests')
  listRequests(
    @Req() req: PortalRequest,
    @Query() query: QueryClientRequestsDto,
  ) {
    return this.clientRequestsService.findAllForClient(
      req.portalUser.clientId,
      query,
    );
  }

  @Post('requests')
  createRequest(@Req() req: PortalRequest, @Body() dto: CreateClientRequestDto) {
    return this.clientRequestsService.createForClient(
      req.portalUser.clientId,
      undefined,
      dto,
    );
  }

  @Post('requests/:id/comments')
  addRequestComment(
    @Req() req: PortalRequest,
    @Param('id') id: string,
    @Body() dto: CreateClientRequestCommentDto,
  ) {
    return this.clientRequestsService.addComment(
      id,
      req.portalUser.id,
      dto,
      {
        clientId: req.portalUser.clientId,
        authorEmail: req.portalUser.email,
      },
    );
  }

  @Get('deliverables')
  listDeliverables(
    @Req() req: PortalRequest,
    @Query() query: QueryClientDeliverablesDto,
  ) {
    return this.deliverablesService.findAllForClient(
      req.portalUser.clientId,
      query,
    );
  }

  @Get('deliverables/:id/full-view')
  getDeliverableFullView(@Param('id') id: string) {
    return this.deliverablesService.getFullView(id);
  }

  @Post('deliverables/:id/approve-client')
  approveDeliverable(@Param('id') id: string, @Req() req: PortalRequest) {
    return this.deliverablesService.approveClient(id, req.portalUser.id);
  }

  @Post('deliverables/:id/reject-client')
  rejectDeliverable(
    @Param('id') id: string,
    @Body() dto: RejectClientDeliverableDto,
    @Req() req: PortalRequest,
  ) {
    return this.deliverablesService.rejectClient(id, dto, req.portalUser.id);
  }

  @Post('deliverables/items/:itemId/revision')
  reviseDeliverableItemPost(
    @Param('itemId') itemId: string,
    @Body() dto: RevisionDeliverableItemDto,
    @Req() req: PortalRequest,
  ) {
    return this.reviseDeliverableItem(itemId, dto, req);
  }

  @Patch('deliverables/items/:itemId/revision')
  reviseDeliverableItem(
    @Param('itemId') itemId: string,
    @Body() dto: RevisionDeliverableItemDto,
    @Req() req: PortalRequest,
  ) {
    return this.deliverablesService.reviseItem(itemId, dto, req.portalUser.id);
  }
}

@Controller('portal')
export class PortalAuthRoutesController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('auth/login')
  login(@Body() dto: PortalLoginDto) {
    return this.portalAuthService.login(dto);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('auth/refresh')
  refresh(@Body() body: { refreshToken?: string }) {
    if (!body.refreshToken) {
      throw new BadRequestException('Refresh token required');
    }
    return this.portalAuthService.refresh(body.refreshToken);
  }

  @Public()
  @Post('auth/logout')
  logout(@Body() body: { refreshToken?: string }) {
    if (body.refreshToken) {
      return this.portalAuthService.logout(body.refreshToken);
    }
    return { success: true };
  }

  @Post('provision/:clientId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...USER_MANAGEMENT_ROLES)
  provisionAccess(
    @Param('clientId') clientId: string,
    @Body() dto: ProvisionPortalAccessDto,
  ) {
    return this.portalAuthService.provisionPortalAccess(clientId, dto.password);
  }
}
