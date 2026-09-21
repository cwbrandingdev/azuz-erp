import { Controller, Header, HttpCode, Post, Req, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { VoiceService } from './voice.service';

@Public()
@SkipThrottle()
@Controller('voice')
export class VoiceWebhookController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('twiml')
  @HttpCode(200)
  @Header('Content-Type', 'text/xml')
  async twiml(@Req() req: Request, @Res() res: Response) {
    const xml = await this.voiceService.buildTwiml(req);
    res.type('text/xml').send(xml);
  }

  @Post('status')
  @HttpCode(204)
  async status(@Req() req: Request, @Res() res: Response) {
    await this.voiceService.handleStatus(req);
    res.status(204).send();
  }
}
