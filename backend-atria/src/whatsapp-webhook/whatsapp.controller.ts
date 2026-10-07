import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DEFAULT_COMPANY_ID } from '../company/company.constants';
import { CreateWhatsappConversationDto } from './dto/create-whatsapp-conversation.dto';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
@AllowAuthenticated()
export class WhatsappController {
  constructor(private readonly webhookService: WhatsappWebhookService) {}

  @Get('conversations')
  listConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.webhookService.listConversations(this.companyId(user));
  }

  @Post('conversations')
  createConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWhatsappConversationDto,
  ) {
    return this.webhookService.createConversation(
      this.companyId(user),
      dto.phone,
      dto.name,
    );
  }

  @Get('conversations/:id/messages')
  listMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.webhookService.listMessages(this.companyId(user), id);
  }

  @Post('messages')
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendWhatsappMessageDto,
  ) {
    return this.webhookService.sendText(
      this.companyId(user),
      user.userId,
      dto.to,
      dto.body,
    );
  }

  private companyId(user: AuthenticatedUser) {
    return user.companyId ?? DEFAULT_COMPANY_ID;
  }
}
