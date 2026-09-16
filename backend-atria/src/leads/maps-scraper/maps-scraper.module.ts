import { Module } from '@nestjs/common';
import { CompanySettingsModule } from '../../company-settings/company-settings.module';
import { MapsScraperService } from './maps-scraper.service';

@Module({
  imports: [CompanySettingsModule],
  providers: [MapsScraperService],
  exports: [MapsScraperService],
})
export class MapsScraperModule {}
