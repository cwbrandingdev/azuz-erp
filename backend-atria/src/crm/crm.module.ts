import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { CrmBoardSettingsController } from './crm-board-settings.controller';
import { CrmLeadsController } from './crm-leads.controller';
import { CrmRemindersController } from './crm-reminders.controller';
import { CrmStagesController } from './crm-stages.controller';

@Module({
  imports: [LeadsModule],
  controllers: [
    CrmStagesController,
    CrmBoardSettingsController,
    CrmRemindersController,
    CrmLeadsController,
  ],
})
export class CrmModule {}
