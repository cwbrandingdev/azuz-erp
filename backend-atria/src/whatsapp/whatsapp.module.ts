import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsAppAutomationService } from './application/whatsapp-automation.service';
import { WhatsAppCollaborationService } from './application/whatsapp-collaboration.service';
import { WhatsAppCrmService } from './application/whatsapp-crm.service';
import { WhatsAppRoutingService } from './application/whatsapp-routing.service';
import { WhatsAppService } from './application/whatsapp.service';
import { WhatsAppGraphGateway } from './domain/whatsapp-graph.gateway';
import { WhatsAppMessageRepository } from './domain/whatsapp-message.repository';
import { MetaWhatsAppGraphClient } from './infrastructure/meta-whatsapp-graph.client';
import { PrismaWhatsAppMessageRepository } from './infrastructure/prisma-whatsapp-message.repository';
import { WhatsAppConfig } from './infrastructure/whatsapp.config';
import { WhatsAppMediaStore } from './infrastructure/whatsapp-media.store';
import { WhatsAppController } from './presentation/whatsapp.controller';
import { WhatsAppWebhookController } from './presentation/whatsapp-webhook.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60_000,
      maxRedirects: 5,
    }),
    NotificationsModule,
  ],
  controllers: [WhatsAppWebhookController, WhatsAppController],
  providers: [
    WhatsAppConfig,
    WhatsAppMediaStore,
    WhatsAppService,
    WhatsAppCrmService,
    WhatsAppRoutingService,
    WhatsAppAutomationService,
    WhatsAppCollaborationService,
    {
      provide: WhatsAppMessageRepository,
      useClass: PrismaWhatsAppMessageRepository,
    },
    {
      provide: WhatsAppGraphGateway,
      useClass: MetaWhatsAppGraphClient,
    },
  ],
  exports: [
    WhatsAppService,
    WhatsAppRoutingService,
    WhatsAppCrmService,
    WhatsAppAutomationService,
    WhatsAppCollaborationService,
  ],
})
export class WhatsAppModule {}
