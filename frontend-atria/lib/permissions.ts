export const Permission = {
  SYSTEM_ALL: "system:all",
  USERS_MANAGE: "users:manage",
  USERS_DEACTIVATE: "users:deactivate",
  INVITATIONS_MANAGE: "invitations:manage",
  KANBAN_ALL_EDIT: "kanban:all:edit",
  KANBAN_OWN_EDIT: "kanban:own:edit",
  CALENDAR_ALL_EDIT: "calendar:all:edit",
  CALENDAR_OWN_EDIT: "calendar:own:edit",
  CRM_ALL: "crm:all",
  CRM_ORG_LEADS: "crm:org:leads",
  PORTAL_ACCESS: "portal:access",
  DELIVERABLES_OWN: "deliverables:own",
  FINANCE_ACCESS: "finance:access",
  SETTINGS_MANAGE: "settings:manage",
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

export type AppRole =
  | "master"
  | "admin"
  | "designer_master"
  | "designer_junior"
  | "crm"
  | "external_client_crm"
  | "client";

const ROLE_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  master: [Permission.SYSTEM_ALL],
  admin: [
    Permission.USERS_MANAGE,
    Permission.USERS_DEACTIVATE,
    Permission.INVITATIONS_MANAGE,
    Permission.KANBAN_ALL_EDIT,
    Permission.CALENDAR_ALL_EDIT,
    Permission.CRM_ALL,
    Permission.FINANCE_ACCESS,
    Permission.SETTINGS_MANAGE,
  ],
  designer_master: [Permission.KANBAN_ALL_EDIT, Permission.CALENDAR_ALL_EDIT],
  designer_junior: [Permission.KANBAN_OWN_EDIT, Permission.CALENDAR_OWN_EDIT],
  crm: [Permission.CRM_ALL],
  external_client_crm: [Permission.CRM_ORG_LEADS],
  client: [Permission.PORTAL_ACCESS, Permission.DELIVERABLES_OWN],
};

export function normalizeAppRole(role: string | null | undefined): AppRole | null {
  const normalized = (role ?? "").trim().toLowerCase() as AppRole;
  return normalized in ROLE_PERMISSIONS ? normalized : null;
}

export function resolvePermissions(
  role: string | null | undefined,
  explicit?: string[] | null,
): PermissionKey[] {
  if (explicit?.length) {
    return explicit as PermissionKey[];
  }
  const roleName = normalizeAppRole(role);
  if (!roleName) return [];
  return ROLE_PERMISSIONS[roleName] ?? [];
}

export function hasPermission(
  role: string | null | undefined,
  required: PermissionKey | PermissionKey[],
  explicitPermissions?: string[] | null,
): boolean {
  const permissions = resolvePermissions(role, explicitPermissions);
  if (permissions.includes(Permission.SYSTEM_ALL)) {
    return true;
  }
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.every((permission) => permissions.includes(permission));
}

export function hasAnyPermission(
  role: string | null | undefined,
  required: PermissionKey[],
  explicitPermissions?: string[] | null,
): boolean {
  const permissions = resolvePermissions(role, explicitPermissions);
  if (permissions.includes(Permission.SYSTEM_ALL)) {
    return true;
  }
  return required.some((permission) => permissions.includes(permission));
}

export function isClientFacingRole(role: string | null | undefined): boolean {
  const normalized = normalizeAppRole(role);
  return normalized === "client" || normalized === "external_client_crm";
}

export function isMasterOrAdmin(role: string | null | undefined): boolean {
  const normalized = normalizeAppRole(role);
  return normalized === "master" || normalized === "admin";
}

export function isMasterRole(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === "master";
}

export function canPerformInternalApproval(
  role: string | null | undefined,
): boolean {
  const normalized = normalizeAppRole(role);
  return normalized === "master" || normalized === "designer_master";
}

export function canEditAllKanban(
  role: string | null | undefined,
  explicitPermissions?: string[] | null,
): boolean {
  return hasAnyPermission(
    role,
    [Permission.SYSTEM_ALL, Permission.KANBAN_ALL_EDIT],
    explicitPermissions,
  );
}

export function canEditOwnKanbanOnly(
  role: string | null | undefined,
  explicitPermissions?: string[] | null,
): boolean {
  return (
    hasPermission(role, Permission.KANBAN_OWN_EDIT, explicitPermissions) &&
    !canEditAllKanban(role, explicitPermissions)
  );
}

export function canEditKanbanTask(
  role: string | null | undefined,
  userId: string | null | undefined,
  task: {
    createdBy?: { id: string } | null;
    assignees?: Array<{ id: string }>;
  },
  explicitPermissions?: string[] | null,
): boolean {
  if (canEditAllKanban(role, explicitPermissions)) {
    return true;
  }
  if (!userId || !canEditOwnKanbanOnly(role, explicitPermissions)) {
    return false;
  }
  const createdById = task.createdBy?.id;
  const assigneeIds = task.assignees?.map((assignee) => assignee.id) ?? [];
  return createdById === userId || assigneeIds.includes(userId);
}

export function canAccessCrm(
  role: string | null | undefined,
  explicitPermissions?: string[] | null,
): boolean {
  return hasAnyPermission(
    role,
    [Permission.CRM_ALL, Permission.CRM_ORG_LEADS],
    explicitPermissions,
  );
}

export const ROLE_LABELS: Record<string, string> = {
  master: "Master",
  admin: "Administrador",
  designer_master: "Designer Sênior",
  designer_junior: "Designer Júnior",
  crm: "CRM",
  external_client_crm: "CRM Externo",
  client: "Cliente",
  manager: "Gestor",
  user: "Usuário",
  content_creator: "Criador de Conteúdo",
};
