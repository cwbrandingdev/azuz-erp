import { Module } from '@nestjs/common';
import { CalendarModule } from '../calendar/calendar.module';
import { KanbanModule } from '../kanban/kanban.module';
import { MetaPublishingModule } from '../integrations/meta-publishing/meta-publishing.module';
import { MetaInsightsModule } from '../meta-insights/meta-insights.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [
    NotificationsModule,
    MetaInsightsModule,
    CalendarModule,
    KanbanModule,
    MetaPublishingModule,
  ],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
