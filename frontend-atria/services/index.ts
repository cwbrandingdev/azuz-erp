export { apiRequest, ApiError, API_BASE_URL, uploadFile } from "./api";
export { toast, showApiError } from "@/lib/toast";

export * as authService from "./auth.service";
export * as calendarService from "./calendar.service";
export * as leadsService from "./leads.service";
export * as kanbanService from "./kanban.service";
export * as financeService from "./finance.service";
export * as clientsService from "./clients.service";
export * as clientGroupsService from "./client-groups.service";
export * as companiesService from "./companies.service";
export * as artTypePricingService from "./art-type-pricing.service";
export * as calendarEntriesService from "./calendar-entries.service";
export * as agendaEventsService from "./agenda-events.service";
export * as clientRequestsService from "./client-requests.service";
export * as clientReportFilesService from "./client-report-files.service";
export * as contractsService from "./contracts.service";

export * as proposalsService from "./proposals.service";
export * as reportsService from "./reports.service";
export * as portalService from "./portal.service";
export * as clientPortalService from "./client-portal.service";
export * as assetsService from "./assets.service";
export * as notificationsService from "./notifications.service";
export * as settingsService from "./settings.service";
export * as companySettingsService from "./company-settings.service";
export * as slaService from "./sla.service";
export * as usersService from "./users.service";
export * as organizationsService from "./organizations.service";
export * as userGroupsService from "./user-groups.service";
export * as contentService from "./content.service";
export * as creationService from "./creation.service";
export * as deliverablesService from "./deliverables.service";
export * as internalApprovalsService from "./internal-approvals.service";
export * as suggestionsService from "./suggestions.service";
export * as appUpdatesService from "./app-updates.service";
export * as insightsService from "./insights.service";
export * as metaAnalyticsService from "./meta-analytics.service";
export * as instagramInsightsService from "./instagram-insights.service";
export * as performanceService from "./insights.service";
export * as dashboardService from "./dashboard.service";
/** @deprecated Use calendarService */
export * as agendaService from "./calendar.service";

export type * from "./types";
