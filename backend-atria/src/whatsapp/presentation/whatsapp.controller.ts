import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AllowAuthenticated } from '../../auth/decorators/allow-authenticated.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WhatsAppService } from '../application/whatsapp.service';
import { SendWhatsAppMessageDto } from './dto/send-whatsapp-message.dto';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
@AllowAuthenticated()
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Post('send')
  send(@Body() dto: SendWhatsAppMessageDto) {
    return this.whatsAppService.send(dto.to, dto.message);
  }

  @Get('conversations')
  listConversations() {
    return this.whatsAppService.listConversations();
  }

  @Get('messages/:phone')
  listByPhone(@Param('phone') phone: string) {
    return this.whatsAppService.listByPhone(phone);
  }
}
