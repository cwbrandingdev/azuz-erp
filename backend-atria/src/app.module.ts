import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AgendaModule } from './agenda/agenda.module';
import { AiModule } from './ai/ai.module';
import { AppUpdatesModule } from './app-updates/app-updates.module';
import { ArtTypePricingModule } from './art-type-pricing/art-type-pricing.module';
import { AssetsModule } from './assets/assets.module';
import { AuthModule } from './auth/auth.module';
import { CalendarEntriesModule } from './calendar-entries/calendar-entries.module';
import { CalendarModule } from './calendar/calendar.module';
import { ClientGroupsModule } from './client-groups/client-groups.module';
import { ClientReportFilesModule } from './client-report-files/client-report-files.module';
import { ClientRequestsModule } from './client-requests/client-requests.module';
import { ClientsModule } from './clients/clients.module';
import { CompaniesModule } from './companies/companies.module';
import { CompanySettingsModule } from './company-settings/company-settings.module';
import { validateEnv } from './config/env.validation';
import { ContractsModule } from './contracts/contracts.module';
import { ContentModule } from './content/content.module';
import { CreationModule } from './creation/creation.module';
import { CrmModule } from './crm/crm.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DeliverablesModule } from './deliverables/deliverables.module';
import { PortalModule } from './portal/portal.module';
import { FinanceModule } from './finance/finance.module';
import { HealthModule } from './health/health.module';
import { MetaAnalyticsModule } from './integrations/meta-analytics/meta-analytics.module';
import { InstagramInsightsModule } from './integrations/instagram-insights/instagram-insights.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { InternalApprovalsModule } from './internal-approvals/internal-approvals.module';
import { KanbanModule } from './kanban/kanban.module';
import { LeadsModule } from './leads/leads.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { MetaInsightsModule } from './meta-insights/meta-insights.module';
import { MessageModule } from './message/message.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProposalsModule } from './proposals/proposals.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { SlaModule } from './sla/sla.module';
import { SuggestionsModule } from './suggestions/suggestions.module';
import { SupabaseModule } from './supabase/supabase.module';
import { UserGroupsModule } from './user-groups/user-groups.module';
import { UsersModule } from './users/users.module';
import { LeadMinerModule } from './leadminer/leadminer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SupabaseModule,
    HealthModule,
    AgendaModule,
    AiModule,
    AppUpdatesModule,
    ArtTypePricingModule,
    AuthModule,
    AssetsModule,
    CalendarModule,
    CalendarEntriesModule,
    ClientsModule,
    ClientGroupsModule,
    ClientReportFilesModule,
    ClientRequestsModule,
    CompaniesModule,
    CompanySettingsModule,
    ContractsModule,
    ContentModule,
    CreationModule,
    CrmModule,
    DashboardModule,
    DeliverablesModule,
    FinanceModule,
    IntegrationsModule,
    InternalApprovalsModule,
    MetaAnalyticsModule,
    InstagramInsightsModule,
    KanbanModule,
    LeadsModule,
    OrganizationsModule,
    LeadMinerModule,
    MetaInsightsModule,
    MessageModule,
    NotificationsModule,
    PortalModule,
    ProposalsModule,
    ReportsModule,
    SettingsModule,
    SuggestionsModule,
    UserGroupsModule,
    UsersModule,
    SlaModule,
  ],
})
export class AppModule {}
