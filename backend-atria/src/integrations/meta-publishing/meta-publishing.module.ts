import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../notifications/notifications.module';
import { InstagramInsightsModule } from '../instagram-insights/instagram-insights.module';
import { MetaOAuthController } from './meta-oauth.controller';
import { MetaOAuthService } from './meta-oauth.service';
import { MetaPublishingService } from './meta-publishing.service';
import { MetaPublishingSyncService } from './meta-publishing.sync.service';

@Module({
  imports: [InstagramInsightsModule, NotificationsModule],
  controllers: [MetaOAuthController],
  providers: [
    MetaPublishingService,
    MetaOAuthService,
    MetaPublishingSyncService,
  ],
  exports: [MetaPublishingService, MetaOAuthService, MetaPublishingSyncService],
})
export class MetaPublishingModule {}
