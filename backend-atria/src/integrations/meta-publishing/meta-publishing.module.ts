import { Module } from '@nestjs/common';
import { InstagramInsightsModule } from '../instagram-insights/instagram-insights.module';
import { MetaOAuthController } from './meta-oauth.controller';
import { MetaOAuthService } from './meta-oauth.service';
import { MetaPublishingService } from './meta-publishing.service';

@Module({
  imports: [InstagramInsightsModule],
  controllers: [MetaOAuthController],
  providers: [MetaPublishingService, MetaOAuthService],
  exports: [MetaPublishingService, MetaOAuthService],
})
export class MetaPublishingModule {}
