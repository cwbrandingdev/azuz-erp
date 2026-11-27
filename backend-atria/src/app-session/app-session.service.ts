import { Injectable } from '@nestjs/common';
import { ClientRequestStatus, RoleName } from '@prisma/client';
import { AppUpdatesService } from '../app-updates/app-updates.service';
import {
  hasPermission,
  Permission,
} from '../auth/constants/permissions';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ClientRequestsService } from '../client-requests/client-requests.service';
import { CompaniesService } from '../companies/companies.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { FinanceService } from '../finance/finance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';

const DASHBOARD_ROLES = new Set<string>([
  RoleName.MASTER,
  RoleName.ADMIN,
]);

const REQUEST_ROLES = new Set<string>([
  RoleName.MASTER,
  RoleName.ADMIN,
  RoleName.CRM,
]);

@Injectable()
export class AppSessionService {
  constructor(
    private readonly companies: CompaniesService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly appUpdates: AppUpdatesService,
    private readonly finance: FinanceService,
    private readonly dashboard: DashboardService,
    private readonly clientRequests: ClientRequestsService,
  ) {}

  async getSession(user: AuthenticatedUser) {
    const role = user.role.toUpperCase();
    const canFinance = hasPermission(user.role, Permission.FINANCE_ACCESS);
    const canDashboard = DASHBOARD_ROLES.has(role);
    const canRequests = REQUEST_ROLES.has(role);

    const [
      company,
      branding,
      appearance,
      notifications,
      unreadCount,
      appUpdatesAccess,
      financeDueToday,
      dashboard,
      pendingRequests,
    ] = await Promise.all([
      this.companies.findPrimary(),
      this.settings.getBranding(),
      this.settings.getAppearance(user.userId),
      this.notifications.findAll(user.userId),
      this.notifications.getUnreadCount(user.userId),
      this.appUpdates.getAccess(user.userId, user.role, user.companyId),
      canFinance
        ? this.finance.getDueTodayAlerts(user.userId)
        : Promise.resolve(null),
      canDashboard
        ? this.dashboard.getOverview(user.userId, user.role)
        : Promise.resolve(null),
      canRequests
        ? this.clientRequests.findAll({ status: ClientRequestStatus.PENDING })
        : Promise.resolve([]),
    ]);

    return {
      company,
      branding,
      appearance,
      notifications,
      unreadCount,
      appUpdatesAccess,
      financeDueToday,
      dashboard,
      pendingRequests,
    };
  }
}
