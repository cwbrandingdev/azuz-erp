import { Module } from '@nestjs/common';
import { SiteLeadsController } from './site-leads.controller';
import { SiteLeadsService } from './site-leads.service';

@Module({
  controllers: [SiteLeadsController],
  providers: [SiteLeadsService],
})
export class SiteLeadsModule {}
