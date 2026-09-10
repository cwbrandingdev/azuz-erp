"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const agenda_module_1 = require("./agenda/agenda.module");
const ai_module_1 = require("./ai/ai.module");
const app_updates_module_1 = require("./app-updates/app-updates.module");
const art_type_pricing_module_1 = require("./art-type-pricing/art-type-pricing.module");
const assets_module_1 = require("./assets/assets.module");
const auth_module_1 = require("./auth/auth.module");
const calendar_entries_module_1 = require("./calendar-entries/calendar-entries.module");
const calendar_module_1 = require("./calendar/calendar.module");
const client_groups_module_1 = require("./client-groups/client-groups.module");
const client_report_files_module_1 = require("./client-report-files/client-report-files.module");
const client_requests_module_1 = require("./client-requests/client-requests.module");
const clients_module_1 = require("./clients/clients.module");
const companies_module_1 = require("./companies/companies.module");
const company_settings_module_1 = require("./company-settings/company-settings.module");
const env_validation_1 = require("./config/env.validation");
const contracts_module_1 = require("./contracts/contracts.module");
const content_module_1 = require("./content/content.module");
const creation_module_1 = require("./creation/creation.module");
const crm_module_1 = require("./crm/crm.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const deliverables_module_1 = require("./deliverables/deliverables.module");
const portal_module_1 = require("./portal/portal.module");
const finance_module_1 = require("./finance/finance.module");
const health_module_1 = require("./health/health.module");
const meta_analytics_module_1 = require("./integrations/meta-analytics/meta-analytics.module");
const instagram_insights_module_1 = require("./integrations/instagram-insights/instagram-insights.module");
const integrations_module_1 = require("./integrations/integrations.module");
const internal_approvals_module_1 = require("./internal-approvals/internal-approvals.module");
const kanban_module_1 = require("./kanban/kanban.module");
const leads_module_1 = require("./leads/leads.module");
const organizations_module_1 = require("./organizations/organizations.module");
const meta_insights_module_1 = require("./meta-insights/meta-insights.module");
const message_module_1 = require("./message/message.module");
const notifications_module_1 = require("./notifications/notifications.module");
const prisma_module_1 = require("./prisma/prisma.module");
const proposals_module_1 = require("./proposals/proposals.module");
const reports_module_1 = require("./reports/reports.module");
const settings_module_1 = require("./settings/settings.module");
const sla_module_1 = require("./sla/sla.module");
const suggestions_module_1 = require("./suggestions/suggestions.module");
const supabase_module_1 = require("./supabase/supabase.module");
const user_groups_module_1 = require("./user-groups/user-groups.module");
const users_module_1 = require("./users/users.module");
const leadminer_module_1 = require("./leadminer/leadminer.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validate: env_validation_1.validateEnv,
            }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            supabase_module_1.SupabaseModule,
            health_module_1.HealthModule,
            agenda_module_1.AgendaModule,
            ai_module_1.AiModule,
            app_updates_module_1.AppUpdatesModule,
            art_type_pricing_module_1.ArtTypePricingModule,
            auth_module_1.AuthModule,
            assets_module_1.AssetsModule,
            calendar_module_1.CalendarModule,
            calendar_entries_module_1.CalendarEntriesModule,
            clients_module_1.ClientsModule,
            client_groups_module_1.ClientGroupsModule,
            client_report_files_module_1.ClientReportFilesModule,
            client_requests_module_1.ClientRequestsModule,
            companies_module_1.CompaniesModule,
            company_settings_module_1.CompanySettingsModule,
            contracts_module_1.ContractsModule,
            content_module_1.ContentModule,
            creation_module_1.CreationModule,
            crm_module_1.CrmModule,
            dashboard_module_1.DashboardModule,
            deliverables_module_1.DeliverablesModule,
            finance_module_1.FinanceModule,
            integrations_module_1.IntegrationsModule,
            internal_approvals_module_1.InternalApprovalsModule,
            meta_analytics_module_1.MetaAnalyticsModule,
            instagram_insights_module_1.InstagramInsightsModule,
            kanban_module_1.KanbanModule,
            leads_module_1.LeadsModule,
            organizations_module_1.OrganizationsModule,
            leadminer_module_1.LeadMinerModule,
            meta_insights_module_1.MetaInsightsModule,
            message_module_1.MessageModule,
            notifications_module_1.NotificationsModule,
            portal_module_1.PortalModule,
            proposals_module_1.ProposalsModule,
            reports_module_1.ReportsModule,
            settings_module_1.SettingsModule,
            suggestions_module_1.SuggestionsModule,
            user_groups_module_1.UserGroupsModule,
            users_module_1.UsersModule,
            sla_module_1.SlaModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map