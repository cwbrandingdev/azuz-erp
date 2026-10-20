import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES } from '../../common/upload/upload-limits';
import { ValidateUploadFileSizePipe } from '../../common/upload/validate-upload-file-size.pipe';
import { AllowAuthenticated } from '../../auth/decorators/allow-authenticated.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WhatsAppAutomationService } from '../application/whatsapp-automation.service';
import { WhatsAppCollaborationService } from '../application/whatsapp-collaboration.service';
import { WhatsAppCrmService } from '../application/whatsapp-crm.service';
import { WhatsAppCopilotDto } from './dto/copilot.dto';
import { TransferConversationDto } from './dto/transfer-conversation.dto';
import { WhatsAppRoutingService } from '../application/whatsapp-routing.service';
import { WhatsAppService } from '../application/whatsapp.service';
import { UpsertBotFlowDto } from './dto/upsert-bot-flow.dto';
import {
  PreviewBroadcastDto,
  UpsertBroadcastDto,
} from './dto/upsert-broadcast.dto';
import { FireTriggerDto, UpsertTriggerDto } from './dto/upsert-trigger.dto';
import { CreateCannedResponseDto } from './dto/create-canned-response.dto';
import { CreateWhatsAppNoteDto } from './dto/create-whatsapp-note.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { SendCannedDto } from './dto/send-canned.dto';
import { SendLocationDto } from './dto/send-location.dto';
import { SendMediaDto } from './dto/send-media.dto';
import { SendTemplateDto } from './dto/send-template.dto';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';
import { UpdateInboxSettingsDto } from './dto/update-inbox-settings.dto';
import { UpdateWhatsAppConversationDto } from './dto/update-whatsapp-conversation.dto';
import { UpdateCrmContactDto } from './dto/update-crm-contact.dto';
import { UpsertRoutingRulesDto } from './dto/upsert-routing-rules.dto';
import { UpsertStageMessagesDto } from './dto/upsert-stage-messages.dto';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
@AllowAuthenticated()
export class WhatsAppController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly routing: WhatsAppRoutingService,
    private readonly crm: WhatsAppCrmService,
    private readonly automation: WhatsAppAutomationService,
    private readonly collaboration: WhatsAppCollaborationService,
  ) {}

  @Post('send')
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendWhatsAppMessageDto,
  ) {
    return this.whatsAppService.send(dto.to, dto.message, user.userId);
  }

  @Post('send-media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES },
    }),
  )
  sendMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMediaDto,
    @UploadedFile(ValidateUploadFileSizePipe) file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatório');
    }
    return this.whatsAppService.sendMedia(
      dto.to,
      file,
      dto.caption,
      user.userId,
    );
  }

  @Post('send-location')
  sendLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendLocationDto,
  ) {
    return this.whatsAppService.sendLocation(
      dto.to,
      dto.latitude,
      dto.longitude,
      dto.name,
      dto.address,
      user.userId,
    );
  }

  @Post('send-template')
  sendTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendTemplateDto,
  ) {
    return this.whatsAppService.sendTemplate(
      dto.to,
      dto.name,
      dto.language,
      dto.parameters ?? [],
      user.userId,
    );
  }

  @Post('send-canned')
  sendCanned(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendCannedDto,
  ) {
    return this.whatsAppService.sendCanned(dto.to, dto.cannedId, user.userId);
  }

  @Get('templates')
  listTemplates() {
    return this.whatsAppService.listTemplates();
  }

  @Get('inbox/counts')
  inboxCounts(@CurrentUser() user: AuthenticatedUser) {
    return this.routing.inboxCounts(
      user.companyId ?? '00000000-0000-4000-8000-000000000001',
      user.userId,
    );
  }

  @Get('inbox/settings')
  getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.routing.getSettings(
      user.companyId ?? '00000000-0000-4000-8000-000000000001',
    );
  }

  @Patch('inbox/settings')
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateInboxSettingsDto,
  ) {
    return this.routing.updateSettings(
      user.companyId ?? '00000000-0000-4000-8000-000000000001',
      dto,
    );
  }

  @Get('inbox/rules')
  listRules(@CurrentUser() user: AuthenticatedUser) {
    return this.routing.listRules(
      user.companyId ?? '00000000-0000-4000-8000-000000000001',
    );
  }

  @Put('inbox/rules')
  replaceRules(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertRoutingRulesDto,
  ) {
    return this.routing.replaceRules(
      user.companyId ?? '00000000-0000-4000-8000-000000000001',
      dto.rules,
    );
  }

  @Get('inbox/stage-messages')
  listStageMessages(@CurrentUser() user: AuthenticatedUser) {
    return this.crm.listStageMessages(
      user.companyId ?? '00000000-0000-4000-8000-000000000001',
    );
  }

  @Put('inbox/stage-messages')
  replaceStageMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertStageMessagesDto,
  ) {
    return this.crm.replaceStageMessages(
      user.companyId ?? '00000000-0000-4000-8000-000000000001',
      dto.rules,
    );
  }

  @Get('automation/flows')
  listFlows(@CurrentUser() user: AuthenticatedUser) {
    return this.automation.listFlows(this.companyId(user));
  }

  @Post('automation/flows')
  createFlow(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertBotFlowDto,
  ) {
    return this.automation.createFlow(this.companyId(user), dto);
  }

  @Patch('automation/flows/:id')
  updateFlow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertBotFlowDto,
  ) {
    return this.automation.updateFlow(this.companyId(user), id, dto);
  }

  @Delete('automation/flows/:id')
  deleteFlow(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.automation.deleteFlow(this.companyId(user), id);
  }

  @Get('automation/broadcasts')
  listBroadcasts(@CurrentUser() user: AuthenticatedUser) {
    return this.automation.listBroadcasts(this.companyId(user));
  }

  @Post('automation/broadcasts')
  createBroadcast(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertBroadcastDto,
  ) {
    return this.automation.createBroadcast(this.companyId(user), dto);
  }

  @Patch('automation/broadcasts/:id')
  updateBroadcast(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertBroadcastDto,
  ) {
    return this.automation.updateBroadcast(this.companyId(user), id, dto);
  }

  @Post('automation/broadcasts/preview')
  previewBroadcast(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PreviewBroadcastDto,
  ) {
    return this.automation.previewBroadcast(this.companyId(user), dto);
  }

  @Post('automation/broadcasts/:id/start')
  startBroadcast(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.automation.startBroadcast(this.companyId(user), id);
  }

  @Post('automation/broadcasts/:id/pause')
  pauseBroadcast(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.automation.pauseBroadcast(this.companyId(user), id);
  }

  @Delete('automation/broadcasts/:id')
  deleteBroadcast(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.automation.deleteBroadcast(this.companyId(user), id);
  }

  @Get('automation/triggers')
  listTriggers(@CurrentUser() user: AuthenticatedUser) {
    return this.automation.listTriggers(this.companyId(user));
  }

  @Post('automation/triggers')
  createTrigger(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertTriggerDto,
  ) {
    return this.automation.createTrigger(this.companyId(user), dto);
  }

  @Patch('automation/triggers/:id')
  updateTrigger(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertTriggerDto,
  ) {
    return this.automation.updateTrigger(this.companyId(user), id, dto);
  }

  @Delete('automation/triggers/:id')
  deleteTrigger(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.automation.deleteTrigger(this.companyId(user), id);
  }

  @Post('automation/triggers/fire')
  fireTrigger(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FireTriggerDto,
  ) {
    return this.automation.fireTriggerEvent({
      companyId: this.companyId(user),
      eventType: dto.eventType,
      phone: dto.phone,
      entityKey: dto.entityKey,
      vars: dto.vars,
    });
  }

  @Get('conversations')
  listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryConversationsDto,
  ) {
    return this.whatsAppService.listConversations(
      {
        tab: query.tab,
        status: query.status,
        assignee: query.assignee ?? 'all',
        userId: user.userId,
        query: query.q,
        operatorId: query.operatorId,
        label: query.label,
        stageId: query.stageId,
        source: query.source,
        leadStatus: query.leadStatus,
      },
      user.companyId ?? undefined,
    );
  }

  @Get('conversations/:phone/crm')
  getCrmContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param('phone') phone: string,
  ) {
    return this.crm.getContext(
      phone,
      user.companyId ?? '00000000-0000-4000-8000-000000000001',
    );
  }

  @Patch('conversations/:phone/crm')
  updateCrmContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('phone') phone: string,
    @Body() dto: UpdateCrmContactDto,
  ) {
    return this.crm.updateContact(
      phone,
      user.companyId ?? '00000000-0000-4000-8000-000000000001',
      dto,
      user.userId,
    );
  }

  @Get('conversations/:phone')
  getConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('phone') phone: string,
  ) {
    return this.whatsAppService.getConversation(phone, user.companyId ?? undefined);
  }

  @Patch('conversations/:phone')
  updateConversation(
    @Param('phone') phone: string,
    @Body() dto: UpdateWhatsAppConversationDto,
  ) {
    return this.whatsAppService.updateConversation(phone, {
      name: dto.name,
      status: dto.status,
      priority: dto.priority,
      assignedUserId:
        dto.assignedUserId === undefined
          ? undefined
          : dto.assignedUserId
            ? dto.assignedUserId
            : null,
      labels: dto.labels,
    });
  }

  @Post('conversations/:phone/notes')
  addNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('phone') phone: string,
    @Body() dto: CreateWhatsAppNoteDto,
  ) {
    return this.collaboration.addPrivateNote({
      companyId: this.companyId(user),
      phone,
      message: dto.message,
      userId: user.userId,
    });
  }

  @Post('conversations/:phone/transfer')
  transfer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('phone') phone: string,
    @Body() dto: TransferConversationDto,
  ) {
    return this.collaboration.transfer({
      companyId: this.companyId(user),
      phone,
      note: dto.note,
      actorUserId: user.userId,
      targetUserId: dto.targetUserId,
      targetUserGroupId: dto.targetUserGroupId,
    });
  }

  @Post('conversations/:phone/copilot')
  copilot(
    @Param('phone') phone: string,
    @Body() dto: WhatsAppCopilotDto,
  ) {
    return this.collaboration.copilot({
      phone,
      action: dto.action,
      text: dto.text,
      tone: dto.tone,
    });
  }

  @Get('messages/:phone')
  listByPhone(@Param('phone') phone: string) {
    return this.whatsAppService.listByPhone(phone);
  }

  @Get('canned-responses')
  listCannedResponses() {
    return this.whatsAppService.listCannedResponses();
  }

  @Post('canned-responses')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD_MULTER_FILE_SIZE_LIMIT_BYTES },
    }),
  )
  createCannedResponse(
    @Body() dto: CreateCannedResponseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.whatsAppService.createCannedResponse({
      shortCode: dto.shortCode,
      title: dto.title,
      content: dto.content ?? '',
      file,
    });
  }

  @Delete('canned-responses/:id')
  deleteCannedResponse(@Param('id') id: string) {
    return this.whatsAppService.deleteCannedResponse(id);
  }

  private companyId(user: AuthenticatedUser) {
    return user.companyId ?? '00000000-0000-4000-8000-000000000001';
  }
}
