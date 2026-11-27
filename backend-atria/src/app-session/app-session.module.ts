import { Module } from '@nestjs/common';
import { AppUpdatesModule } from '../app-updates/app-updates.module';
import { ClientRequestsModule } from '../client-requests/client-requests.module';
import { CompaniesModule } from '../companies/companies.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { FinanceModule } from '../finance/finance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { AppSessionController } from './app-session.controller';
import { AppSessionService } from './app-session.service';

@Module({
  imports: [
    CompaniesModule,
    SettingsModule,
    NotificationsModule,
    AppUpdatesModule,
    FinanceModule,
    DashboardModule,
    ClientRequestsModule,
  ],
  controllers: [AppSessionController],
  providers: [AppSessionService],
})
export class AppSessionModule {}
