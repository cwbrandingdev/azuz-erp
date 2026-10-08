import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { WhatsAppService } from './application/whatsapp.service';
import { WhatsAppGraphGateway } from './domain/whatsapp-graph.gateway';
import { WhatsAppMessageRepository } from './domain/whatsapp-message.repository';
import { MetaWhatsAppGraphClient } from './infrastructure/meta-whatsapp-graph.client';
import { PrismaWhatsAppMessageRepository } from './infrastructure/prisma-whatsapp-message.repository';
import { WhatsAppConfig } from './infrastructure/whatsapp.config';
import { WhatsAppController } from './presentation/whatsapp.controller';
import { WhatsAppWebhookController } from './presentation/whatsapp-webhook.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 15_000,
      maxRedirects: 0,
    }),
  ],
  controllers: [WhatsAppWebhookController, WhatsAppController],
  providers: [
    WhatsAppConfig,
    WhatsAppService,
    {
      provide: WhatsAppMessageRepository,
      useClass: PrismaWhatsAppMessageRepository,
    },
    {
      provide: WhatsAppGraphGateway,
      useClass: MetaWhatsAppGraphClient,
    },
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
