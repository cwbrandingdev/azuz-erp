import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../auth/decorators/public.decorator';
import { WhatsAppService } from '../application/whatsapp.service';

@Public()
@SkipThrottle()
@Controller('whatsapp-webhook')
export class WhatsAppWebhookController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    return this.whatsAppService.verifyWebhook(mode, token, challenge);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: unknown): Promise<{ status: string }> {
    await this.whatsAppService.handleWebhook(
      payload && typeof payload === 'object'
        ? (payload as Parameters<WhatsAppService['handleWebhook']>[0])
        : {},
    );
    return { status: 'EVENT_RECEIVED' };
  }
}
