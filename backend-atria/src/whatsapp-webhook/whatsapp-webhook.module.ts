import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Module({
  imports: [ConfigModule],
  controllers: [WhatsappWebhookController],
  providers: [WhatsappWebhookService],
  exports: [WhatsappWebhookService],
})
export class WhatsappWebhookModule {}
