import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleName } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES } from '../common/upload/upload-limits';
import { ValidateUploadFileSizePipe } from '../common/upload/validate-upload-file-size.pipe';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
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
import { CrmScopeService } from '../leads/crm-scope.service';
import { CreateLeadCommentDto } from '../leads/dto/lead-comment.dto';
import { UpdateLeadStatusDto } from '../leads/dto/lead-kanban.dto';
import { LeadsService } from '../leads/leads.service';
import { ToggleLeadCollapseDto } from '../crm/dto/toggle-lead-collapse.dto';
import { PortalBriefingDto, PortalRejectPostDto } from './dto/portal.dto';
import { PortalService } from './portal.service';

@Controller('client-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.CLIENT)
export class ClientPortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly clientRequestsService: ClientRequestsService,
    private readonly deliverablesService: DeliverablesService,
    private readonly leadsService: LeadsService,
    private readonly crmScope: CrmScopeService,
  ) {}

  private requireClientId(user: AuthenticatedUser): string {
    if (!user.clientId) {
      throw new ForbiddenException(
        'Usuário CLIENT sem empresa vinculada. Contate o administrador.',
      );
    }
    return user.clientId;
  }

  private async requireCrmEnabled(clientId: string): Promise<void> {
    await this.crmScope.assertOrganizationCrmEnabled(clientId);
  }

  @Get('crm/kanban')
  async getCrmKanbanBoard(@CurrentUser() user: AuthenticatedUser) {
    const clientId = this.requireClientId(user);
    await this.requireCrmEnabled(clientId);
    return this.leadsService.findKanbanBoard(user, clientId);
  }

  @Patch('crm/leads/:id/stage')
  async updateCrmLeadStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    const clientId = this.requireClientId(user);
    await this.requireCrmEnabled(clientId);
    return this.leadsService.updateLeadStage(user, id, dto);
  }

  @Patch('crm/leads/:id/collapse')
  async toggleCrmLeadCollapse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ToggleLeadCollapseDto,
  ) {
    const clientId = this.requireClientId(user);
    await this.requireCrmEnabled(clientId);
    return this.leadsService.toggleLeadCollapse(user, id, dto.isMinimized);
  }

  @Get('crm/leads/:id/comments')
  async getCrmLeadComments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const clientId = this.requireClientId(user);
    await this.requireCrmEnabled(clientId);
    return this.leadsService.getComments(user, id);
  }

  @Post('crm/leads/:id/comments')
  async createCrmLeadComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateLeadCommentDto,
  ) {
    const clientId = this.requireClientId(user);
    await this.requireCrmEnabled(clientId);
    return this.leadsService.createComment(user, user.userId, id, dto.content);
  }

  @Get()
  getPortalData(@CurrentUser() user: AuthenticatedUser) {
    return this.portalService.getPortalDataForClient(
      this.requireClientId(user),
    );
  }

  @Get('calendar')
  getCalendar(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.portalService.getClientPortalCalendar(
      this.requireClientId(user),
      from,
      to,
    );
  }

  @Get('reports/:reportId')
  getPortalReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reportId') reportId: string,
  ) {
    return this.portalService.getPortalReportForClient(
      this.requireClientId(user),
      reportId,
    );
  }

  @Get('posts/:postId')
  getPortalPost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId') postId: string,
  ) {
    return this.portalService.getPortalPostForClient(
      this.requireClientId(user),
      postId,
    );
  }

  @Patch('posts/:postId/approve')
  approvePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId') postId: string,
  ) {
    return this.portalService.approvePortalPostForClient(
      this.requireClientId(user),
      postId,
    );
  }

  @Patch('posts/:postId/reject')
  rejectPost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('postId') postId: string,
    @Body() dto: PortalRejectPostDto,
  ) {
    return this.portalService.rejectPortalPostForClient(
      this.requireClientId(user),
      postId,
      dto,
    );
  }

  @Get('contracts/:contractId')
  getPortalContract(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contractId') contractId: string,
  ) {
    return this.portalService.getPortalContractForClient(
      this.requireClientId(user),
      contractId,
    );
  }

  @Patch('contracts/:contractId/sign')
  signContract(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contractId') contractId: string,
  ) {
    return this.portalService.signPortalContractForClient(
      this.requireClientId(user),
      contractId,
    );
  }

  @Get('finances')
  getFinances(@CurrentUser() user: AuthenticatedUser) {
    return this.portalService.getClientFinancesForClient(
      this.requireClientId(user),
    );
  }

  @Get('requests')
  listRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryClientRequestsDto,
  ) {
    return this.clientRequestsService.findAllForClient(
      this.requireClientId(user),
      query,
    );
  }

  @Post('requests')
  createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClientRequestDto,
  ) {
    return this.clientRequestsService.createForClient(
      this.requireClientId(user),
      user.companyId,
      dto,
    );
  }

  @Post('requests/:id/comments')
  addRequestComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateClientRequestCommentDto,
  ) {
    return this.clientRequestsService.addComment(id, user.userId, dto, {
      clientId: this.requireClientId(user),
      authorEmail: user.email,
    });
  }

  @Get('deliverables')
  listDeliverables(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryClientDeliverablesDto,
  ) {
    return this.deliverablesService.findAllForClient(
      this.requireClientId(user),
      query,
    );
  }

  @Get('deliverables/:id/full-view')
  getDeliverableFullView(@Param('id') id: string) {
    return this.deliverablesService.getFullView(id);
  }

  @Post('deliverables/:id/approve-client')
  approveDeliverable(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliverablesService.approveClient(id, user.userId);
  }

  @Post('deliverables/:id/reject-client')
  rejectDeliverable(
    @Param('id') id: string,
    @Body() dto: RejectClientDeliverableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliverablesService.rejectClient(id, dto, user.userId);
  }

  @Post('deliverables/items/:itemId/revision')
  reviseDeliverableItemPost(
    @Param('itemId') itemId: string,
    @Body() dto: RevisionDeliverableItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviseDeliverableItem(itemId, dto, user);
  }

  @Patch('deliverables/items/:itemId/revision')
  reviseDeliverableItem(
    @Param('itemId') itemId: string,
    @Body() dto: RevisionDeliverableItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliverablesService.reviseItem(itemId, dto, user.userId);
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
      limits: { fileSize: UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES },
    }),
  )
  uploadAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Query('fileType') fileType: string | undefined,
    @UploadedFile(ValidateUploadFileSizePipe) file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatório');
    }
    return this.portalService.uploadPortalAssetForClient(
      this.requireClientId(user),
      file,
      fileType,
    );
  }

  @Post('briefings')
  createBriefing(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PortalBriefingDto,
  ) {
    return this.portalService.createBriefingForClient(
      this.requireClientId(user),
      dto,
    );
  }
}
