import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { DueDateAlertsService } from './due-date-alerts.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushModule } from '../push/push.module';

@Module({
  imports: [MailModule, PushModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, DueDateAlertsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
