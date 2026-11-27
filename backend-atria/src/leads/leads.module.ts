import { Module } from '@nestjs/common';
import { CompanySettingsModule } from '../company-settings/company-settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { CompanyLookupModule } from './company-lookup/company-lookup.module';
import { LeadQualificationModule } from './qualification/lead-qualification.module';
import { MapsScraperModule } from './maps-scraper/maps-scraper.module';
import { CrmScopeService } from './crm-scope.service';
import { LeadNotificationService } from './lead-notification.service';
import { LeadsController } from './leads.controller';
import { LeadStagesService } from './lead-stages.service';
import { GoogleMeetService } from './google-meet.service';
import { LeadsService } from './leads.service';
import { LeadMeetingReminderService } from './lead-meeting-reminder.service';
import { CrmReminderPushService } from './crm-reminder-push.service';
import { PushModule } from '../push/push.module';
import { GoogleConnectionMonitorService } from './google-connection-monitor.service';
import { GoogleConnectionService } from './google-connection.service';
import { GoogleConnectionController } from './google-connection.controller';

@Module({
  imports: [
    CompanyLookupModule,
    LeadQualificationModule,
    MapsScraperModule,
    CompanySettingsModule,
    NotificationsModule,
    WhatsAppModule,
    MailModule,
    PushModule,
  ],
  controllers: [LeadsController, GoogleConnectionController],
  providers: [
    LeadsService,
    GoogleMeetService,
    LeadStagesService,
    CrmScopeService,
    LeadNotificationService,
    LeadMeetingReminderService,
    CrmReminderPushService,
    GoogleConnectionMonitorService,
    GoogleConnectionService,
  ],
  exports: [LeadsService, LeadStagesService, CrmScopeService],
})
export class LeadsModule {}
