import { Module } from '@nestjs/common';
import { CompanySettingsModule } from '../../company-settings/company-settings.module';
import { InstagramInsightsService } from './application/instagram-insights.service';
import { InstagramCredentialsResolver } from './infrastructure/instagram-credentials.resolver';
import { InstagramGraphModule } from './infrastructure/instagram-graph.module';
import { InstagramInsightsController } from './presentation/instagram-insights.controller';

@Module({
  imports: [CompanySettingsModule, InstagramGraphModule],
  controllers: [InstagramInsightsController],
  providers: [InstagramCredentialsResolver, InstagramInsightsService],
  exports: [InstagramInsightsService, InstagramGraphModule],
})
export class InstagramInsightsModule {}
