import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { DueDateAlertsService } from './due-date-alerts.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [MailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, DueDateAlertsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
