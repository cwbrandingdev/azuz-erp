import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TimeClockRemindersService } from './time-clock-reminders.service';
import { TimeClockController } from './time-clock.controller';
import { TimeClockService } from './time-clock.service';
import { WorkHoursCalculator } from './work-hours.calculator';

@Module({
  imports: [NotificationsModule],
  controllers: [TimeClockController],
  providers: [TimeClockService, TimeClockRemindersService, WorkHoursCalculator],
})
export class TimeClockModule {}
