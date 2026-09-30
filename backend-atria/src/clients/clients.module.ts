import { Module } from '@nestjs/common';
import { ClientRequestsModule } from '../client-requests/client-requests.module';
import { InstagramGraphModule } from '../integrations/instagram-insights/infrastructure/instagram-graph.module';
import { MetaInsightsModule } from '../meta-insights/meta-insights.module';
import { UsersModule } from '../users/users.module';
import { Client360Service } from './client-360.service';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [MetaInsightsModule, ClientRequestsModule, UsersModule, InstagramGraphModule],
  controllers: [ClientsController],
  providers: [ClientsService, Client360Service],
  exports: [ClientsService],
})
export class ClientsModule {}
