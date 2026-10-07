import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Controller('whatsapp-webhook')
export class WhatsappWebhookController {
  constructor(private readonly webhookService: WhatsappWebhookService) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    return this.webhookService.verifyWebhook(mode, token, challenge);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() payload: any): { status: string } {
    this.webhookService.handleIncomingPayload(payload);
    return { status: 'EVENT_RECEIVED' };
  }
}
