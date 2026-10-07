import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AllowAuthenticated } from '../auth/decorators/allow-authenticated.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
@AllowAuthenticated()
export class WhatsappController {
  constructor(private readonly webhookService: WhatsappWebhookService) {}

  @Post('messages')
  send(@Body() dto: SendWhatsappMessageDto) {
    return this.webhookService.sendText(dto.to, dto.body);
  }
}
