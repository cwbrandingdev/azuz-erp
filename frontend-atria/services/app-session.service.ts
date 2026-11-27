import type { AgencyBranding } from "@/lib/branding-utils";
import type { AppearanceSettings } from "@/lib/theme-utils";
import { apiRequest } from "./api";
import type { AppUpdatesAccess } from "./types/app-updates";
import type {
  AppNotification,
  ClientRequest,
  DashboardOverview,
  FinanceDueTodayAlerts,
  TenantCompany,
} from "./types";

export interface AppSession {
  company: TenantCompany;
  branding: AgencyBranding;
  appearance: AppearanceSettings;
  notifications: AppNotification[];
  unreadCount: number;
  appUpdatesAccess: AppUpdatesAccess;
  financeDueToday: FinanceDueTodayAlerts | null;
  dashboard: DashboardOverview | null;
  pendingRequests: ClientRequest[];
}

export function getAppSession() {
  return apiRequest<AppSession>("/app/session", { skipToast: true });
}
