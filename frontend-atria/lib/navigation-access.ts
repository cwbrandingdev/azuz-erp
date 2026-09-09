import {
  canPerformInternalApproval,
  hasAnyPermission,
  isMasterOrAdmin,
  Permission,
  type PermissionKey,
} from "./permissions";
import { canAccessClientDirectory } from "./roles";

const ADMIN_ONLY_ROUTES = new Set(["/dashboard", "/dashboard/tv", "/insights"]);
const INTERNAL_APPROVAL_ROUTES = new Set(["/internal-approvals"]);

const ROUTE_PERMISSIONS: Record<string, PermissionKey[]> = {
  "/kanban": [Permission.KANBAN_ALL_EDIT, Permission.KANBAN_OWN_EDIT],
  "/calendar": [Permission.CALENDAR_ALL_EDIT, Permission.CALENDAR_OWN_EDIT],
  "/leads": [Permission.CRM_ALL, Permission.CRM_ORG_LEADS],
  "/leads/kanban": [Permission.CRM_ALL, Permission.CRM_ORG_LEADS],
  "/financial": [Permission.FINANCE_ACCESS],
  "/contracts": [Permission.FINANCE_ACCESS],
  "/proposals": [Permission.FINANCE_ACCESS],
  "/settings/branding": [Permission.SETTINGS_MANAGE],
  "/settings/appearance": [Permission.SETTINGS_MANAGE],
  "/settings/api-integrations": [Permission.SETTINGS_MANAGE],
  "/settings/users": [Permission.USERS_MANAGE],
};

function resolveAccessRouteKey(href: string): string {
  if (href === "/dashboard/tv" || href.startsWith("/dashboard/tv/")) {
    return "/dashboard/tv";
  }
  if (href === "/dashboard" || href.startsWith("/dashboard/")) {
    return "/dashboard";
  }
  if (href === "/insights" || href.startsWith("/insights/")) {
    return "/insights";
  }
  if (
    href === "/internal-approvals" ||
    href.startsWith("/internal-approvals/")
  ) {
    return "/internal-approvals";
  }
  if (href === "/clients" || href.startsWith("/clients/")) {
    return "/clients";
  }
  return href;
}

export function canAccessRoute(
  role: string | null | undefined,
  href: string,
  explicitPermissions?: string[] | null,
): boolean {
  const routeKey = resolveAccessRouteKey(href);

  if (ADMIN_ONLY_ROUTES.has(routeKey)) {
    return isMasterOrAdmin(role);
  }

  if (INTERNAL_APPROVAL_ROUTES.has(routeKey)) {
    return canPerformInternalApproval(role);
  }

  if (routeKey === "/clients") {
    return canAccessClientDirectory(role);
  }

  const required = ROUTE_PERMISSIONS[routeKey];
  if (!required) {
    return true;
  }

  return hasAnyPermission(role, required, explicitPermissions);
}
