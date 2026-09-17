import { Module } from '@nestjs/common';
import { InstagramApifyEnricher } from './instagram-apify.enricher';
import { LeadQualificationService } from './lead-qualification.service';

@Module({
  providers: [InstagramApifyEnricher, LeadQualificationService],
  exports: [LeadQualificationService],
})
export class LeadQualificationModule {}
