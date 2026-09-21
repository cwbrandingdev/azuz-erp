import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { VoiceWebhookController } from './voice.webhook.controller';

@Module({
  imports: [LeadsModule],
  controllers: [VoiceController, VoiceWebhookController],
  providers: [VoiceService],
})
export class VoiceModule {}
