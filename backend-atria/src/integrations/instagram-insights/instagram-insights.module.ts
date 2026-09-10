import { Module } from '@nestjs/common';
import { CompanySettingsModule } from '../../company-settings/company-settings.module';
import { InstagramInsightsService } from './application/instagram-insights.service';
import { InstagramCredentialsResolver } from './infrastructure/instagram-credentials.resolver';
import { InstagramGraphClient } from './infrastructure/instagram-graph.client';
import { InstagramInsightsController } from './presentation/instagram-insights.controller';

@Module({
  imports: [CompanySettingsModule],
  controllers: [InstagramInsightsController],
  providers: [
    InstagramGraphClient,
    InstagramCredentialsResolver,
    InstagramInsightsService,
  ],
  exports: [InstagramInsightsService],
})
export class InstagramInsightsModule {}
