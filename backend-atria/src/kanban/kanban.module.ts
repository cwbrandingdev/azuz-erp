import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../common/media/media.module';
import { DeliverablesModule } from '../deliverables/deliverables.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SlaModule } from '../sla/sla.module';
import { KanbanController } from './kanban.controller';
import { KanbanService } from './kanban.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    MediaModule,
    NotificationsModule,
    SlaModule,
    forwardRef(() => DeliverablesModule),
  ],
  controllers: [KanbanController, TasksController],
  providers: [KanbanService],
  exports: [KanbanService],
})
export class KanbanModule {}
