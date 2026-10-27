import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../common/media/media.module';
import { KanbanModule } from '../kanban/kanban.module';
import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';

@Module({
  imports: [MediaModule, forwardRef(() => KanbanModule)],
  controllers: [DeliverablesController],
  providers: [DeliverablesService],
  exports: [DeliverablesService],
})
export class DeliverablesModule {}