import { Module } from '@nestjs/common';
import { CompanyLookupModule } from '../company-lookup/company-lookup.module';
import { CommercialFitService } from './commercial-fit.service';
import { InstagramApifyEnricher } from './instagram-apify.enricher';
import { LeadQualificationService } from './lead-qualification.service';

@Module({
  imports: [CompanyLookupModule],
  providers: [
    InstagramApifyEnricher,
    CommercialFitService,
    LeadQualificationService,
  ],
  exports: [LeadQualificationService],
})
export class LeadQualificationModule {}
