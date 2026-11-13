import { Module } from '@nestjs/common';
import { JhonatanCalendarController } from './jhonatan-calendar.controller';
import { JhonatanCalendarService } from './jhonatan-calendar.service';

@Module({
  controllers: [JhonatanCalendarController],
  providers: [JhonatanCalendarService],
})
export class JhonatanCalendarModule {}
