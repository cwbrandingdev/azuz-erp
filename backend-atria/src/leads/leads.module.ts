import { Module } from '@nestjs/common';
import { CompanySettingsModule } from '../company-settings/company-settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompanyLookupModule } from './company-lookup/company-lookup.module';
import { MapsScraperModule } from './maps-scraper/maps-scraper.module';
import { CrmScopeService } from './crm-scope.service';
import { LeadNotificationService } from './lead-notification.service';
import { LeadsController } from './leads.controller';
import { LeadStagesService } from './lead-stages.service';
import { LeadsService } from './leads.service';

@Module({
  imports: [
    CompanyLookupModule,
    MapsScraperModule,
    CompanySettingsModule,
    NotificationsModule,
  ],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    LeadStagesService,
    CrmScopeService,
    LeadNotificationService,
  ],
  exports: [LeadsService, LeadStagesService, CrmScopeService],
})
export class LeadsModule {}
