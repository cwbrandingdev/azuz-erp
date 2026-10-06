import { Module } from '@nestjs/common';
import { CompanySettingsModule } from '../company-settings/company-settings.module';
import { LeadsModule } from '../leads/leads.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappWebhookController } from './whatsapp.webhook.controller';

@Module({
  imports: [CompanySettingsModule, LeadsModule],
  controllers: [WhatsappController, WhatsappWebhookController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
