import { Module } from '@nestjs/common';
import { CompanySettingsModule } from '../../company-settings/company-settings.module';
import { SupabaseModule } from '../../supabase/supabase.module';
import { InstagramCredentialsResolver } from '../instagram-insights/infrastructure/instagram-credentials.resolver';
import { InstagramGraphClient } from '../instagram-insights/infrastructure/instagram-graph.client';
import { InstagramPublishMediaResolver } from './instagram-publish-media.resolver';
import { InstagramPublishSchedulerService } from './instagram-publish-scheduler.service';
import { InstagramPublishingService } from './instagram-publishing.service';

@Module({
  imports: [CompanySettingsModule, SupabaseModule],
  providers: [
    InstagramGraphClient,
    InstagramCredentialsResolver,
    InstagramPublishMediaResolver,
    InstagramPublishingService,
    InstagramPublishSchedulerService,
  ],
  exports: [InstagramPublishingService],
})
export class InstagramPublishingModule {}
