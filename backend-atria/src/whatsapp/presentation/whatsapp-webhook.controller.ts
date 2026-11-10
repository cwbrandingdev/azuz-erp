import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { WhatsAppService } from '../application/whatsapp.service';
import { WhatsAppConfig } from '../infrastructure/whatsapp.config';

@Public()
@SkipThrottle()
@Controller('whatsapp-webhook')
export class WhatsAppWebhookController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly config: WhatsAppConfig,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: unknown,
  ): Promise<{ status: string }> {
    this.assertSignature(request.rawBody, request.header('x-webhook-hmac'));
    await this.whatsAppService.handleWebhook(payload);
    return { status: 'EVENT_RECEIVED' };
  }

  private assertSignature(
    rawBody: Buffer | undefined,
    header: string | undefined,
  ): void {
    const key = this.config.webhookHmacKey;
    if (!key) return;
    const provided = header?.trim().replace(/^sha512=/i, '') ?? '';
    if (!rawBody || !provided) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    const expected = createHmac('sha512', key).update(rawBody).digest('hex');
    const left = Buffer.from(expected);
    const right = Buffer.from(provided);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}
