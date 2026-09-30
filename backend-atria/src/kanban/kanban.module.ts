import { Module, forwardRef } from '@nestjs/common';
import { DeliverablesModule } from '../deliverables/deliverables.module';
import { MetaPublishingModule } from '../integrations/meta-publishing/meta-publishing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SlaModule } from '../sla/sla.module';
import { KanbanController } from './kanban.controller';
import { KanbanService } from './kanban.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    NotificationsModule,
    SlaModule,
    MetaPublishingModule,
    forwardRef(() => DeliverablesModule),
  ],
  controllers: [KanbanController, TasksController],
  providers: [KanbanService],
  exports: [KanbanService],
})
export class KanbanModule {}
