import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AllowAuthenticated } from '../../auth/decorators/allow-authenticated.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WhatsAppCallingService } from '../application/whatsapp-calling.service';
import { WhatsAppService } from '../application/whatsapp.service';
import { AnswerWhatsAppCallDto } from './dto/answer-whatsapp-call.dto';
import { CreateCannedResponseDto } from './dto/create-canned-response.dto';
import { CreateWhatsAppNoteDto } from './dto/create-whatsapp-note.dto';
import { InitiateWhatsAppCallDto } from './dto/initiate-whatsapp-call.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';
import { UpdateWhatsAppConversationDto } from './dto/update-whatsapp-conversation.dto';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
@AllowAuthenticated()
export class WhatsAppController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly calling: WhatsAppCallingService,
  ) {}

  @Post('send')
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendWhatsAppMessageDto,
  ) {
    return this.whatsAppService.send(dto.to, dto.message, user.userId);
  }

  @Get('conversations')
  listConversations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryConversationsDto,
  ) {
    return this.whatsAppService.listConversations({
      status: query.status,
      assignee: query.assignee ?? 'all',
      userId: user.userId,
      query: query.q,
    });
  }

  @Get('conversations/:phone')
  getConversation(@Param('phone') phone: string) {
    return this.whatsAppService.getConversation(phone);
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
    return this.whatsAppService.addPrivateNote(
      phone,
      dto.message,
      user.userId,
    );
  }

  @Get('messages/:phone')
  listByPhone(@Param('phone') phone: string) {
    return this.whatsAppService.listByPhone(phone);
  }

  @Get('calls')
  listLiveCalls() {
    return this.calling.listLive();
  }

  @Get('calls/:id')
  getCall(@Param('id') id: string) {
    return this.calling.getById(id);
  }

  @Post('calls')
  initiateCall(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InitiateWhatsAppCallDto,
  ) {
    return this.calling.initiate(dto.to, dto.sdp, user.userId);
  }

  @Post('calls/:id/answer')
  answerCall(@Param('id') id: string, @Body() dto: AnswerWhatsAppCallDto) {
    return this.calling.answer(id, dto.sdp);
  }

  @Post('calls/:id/reject')
  rejectCall(@Param('id') id: string) {
    return this.calling.reject(id);
  }

  @Post('calls/:id/hangup')
  hangupCall(@Param('id') id: string) {
    return this.calling.hangup(id);
  }

  @Get('call-permissions/:phone')
  getCallPermissions(@Param('phone') phone: string) {
    return this.calling.getPermissions(phone);
  }

  @Post('call-permissions/:phone')
  requestCallPermission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('phone') phone: string,
  ) {
    return this.calling.requestPermission(phone, user.userId);
  }

  @Get('canned-responses')
  listCannedResponses() {
    return this.whatsAppService.listCannedResponses();
  }

  @Post('canned-responses')
  createCannedResponse(@Body() dto: CreateCannedResponseDto) {
    return this.whatsAppService.createCannedResponse(dto);
  }

  @Delete('canned-responses/:id')
  deleteCannedResponse(@Param('id') id: string) {
    return this.whatsAppService.deleteCannedResponse(id);
  }
}
