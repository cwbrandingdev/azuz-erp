import { Module } from '@nestjs/common';
import { InstagramGraphModule } from '../integrations/instagram-insights/infrastructure/instagram-graph.module';
import { CompanySettingsController } from './company-settings.controller';
import { CompanySettingsService } from './company-settings.service';

@Module({
  imports: [InstagramGraphModule],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
