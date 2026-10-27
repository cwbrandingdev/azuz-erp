import { normalizeAppRole } from "./permissions";

export function normalizeRole(role: string | null | undefined): string {
  return (role ?? "").trim().toLowerCase();
}

export function isClientRole(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === "client";
}

export function isCrmRole(role: string | null | undefined): boolean {
  const normalized = normalizeAppRole(role);
  return normalized === "crm" || normalized === "external_client_crm";
}

export function isExternalCrmRole(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === "external_client_crm";
}

export function isStaffRole(role: string | null | undefined): boolean {
  const normalized = normalizeAppRole(role);
  return (
    normalized === "master" ||
    normalized === "admin" ||
    normalized === "designer_master" ||
    normalized === "designer_junior" ||
    normalized === "crm"
  );
}

export function isDesignerRole(role: string | null | undefined): boolean {
  const normalized = normalizeAppRole(role);
  return normalized === "designer_master" || normalized === "designer_junior";
}

export function canAccessStaffDashboard(
  role: string | null | undefined,
): boolean {
  const normalized = normalizeAppRole(role);
  return (
    normalized === "master" ||
    normalized === "admin" ||
    normalized === "designer_master" ||
    normalized === "designer_junior"
  );
}

export function canAccessClientDirectory(
  role: string | null | undefined,
): boolean {
  const normalized = normalizeAppRole(role);
  return (
    normalized === "master" ||
    normalized === "admin" ||
    normalized === "crm" ||
    normalized === "designer_master"
  );
}

export function canManageClientDirectory(
  role: string | null | undefined,
): boolean {
  const normalized = normalizeAppRole(role);
  return (
    normalized === "master" || normalized === "admin" || normalized === "crm"
  );
}

// "manager" is not an AppRole, so the raw role name is compared instead.
const TIME_CLOCK_MANAGER_ROLES = new Set(["master", "admin", "manager"]);

export function canManageTimeClock(role: string | null | undefined): boolean {
  return TIME_CLOCK_MANAGER_ROLES.has(normalizeRole(role));
}

export function getHomePathForRole(
  role: string | null | undefined,
  hasCrmEnabled?: boolean | null,
): string {
  const normalized = normalizeAppRole(role);
  if (normalized === "client") {
    return "/client-portal";
  }
  if (normalized === "external_client_crm") {
    return hasCrmEnabled ? "/leads/kanban" : "/client-portal";
  }
  if (normalized === "crm") {
    return "/leads";
  }
  if (normalized === "master" || normalized === "admin") {
    return "/dashboard";
  }
  return "/kanban";
}
