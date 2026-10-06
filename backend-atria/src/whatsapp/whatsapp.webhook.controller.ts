import {
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  type RawBodyRequest,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { WhatsappService } from './whatsapp.service';

@Public()
@SkipThrottle()
@Controller('whatsapp')
export class WhatsappWebhookController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('webhook')
  @Header('Content-Type', 'text/plain')
  async verify(
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const challenge = await this.whatsappService.verifyWebhook(query);
    res.status(200).type('text/plain').send(challenge);
  }

  @Post('webhook')
  @HttpCode(200)
  handle(@Req() req: RawBodyRequest<Request>) {
    return this.whatsappService.handleWebhook({
      body: req.body,
      rawBody: req.rawBody,
      headers: req.headers as { [key: string]: string | string[] | undefined },
    });
  }
}
