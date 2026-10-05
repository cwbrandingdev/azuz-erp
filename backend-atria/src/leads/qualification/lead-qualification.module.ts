import { Module } from '@nestjs/common';
import { CompanyLookupModule } from '../company-lookup/company-lookup.module';
import { MapsScraperModule } from '../maps-scraper/maps-scraper.module';
import { CommercialFitService } from './commercial-fit.service';
import { InstagramApifyEnricher } from './instagram-apify.enricher';
import { LeadQualificationService } from './lead-qualification.service';

@Module({
  imports: [CompanyLookupModule, MapsScraperModule],
  providers: [
    InstagramApifyEnricher,
    CommercialFitService,
    LeadQualificationService,
  ],
  exports: [LeadQualificationService],
})
export class LeadQualificationModule {}
