"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  canEditAllKanban,
  canEditKanbanTask,
  canEditOwnKanbanOnly,
  canPerformInternalApproval,
  hasAnyPermission,
  hasPermission,
  isMasterOrAdmin,
  isMasterRole,
  resolvePermissions,
  type PermissionKey,
} from "@/lib/permissions";
import { canAccessClientDirectory } from "@/lib/roles";

export function usePermissions() {
  const { user } = useAuth();

  return useMemo(() => {
    const role = user?.role ?? null;
    const explicitPermissions = user?.permissions ?? null;

    return {
      role,
      permissions: resolvePermissions(role, explicitPermissions),
      hasPermission: (required: PermissionKey | PermissionKey[]) =>
        hasPermission(role, required, explicitPermissions),
      hasAnyPermission: (required: PermissionKey[]) =>
        hasAnyPermission(role, required, explicitPermissions),
      canEditAllKanban: () => canEditAllKanban(role, explicitPermissions),
      canEditOwnKanbanOnly: () =>
        canEditOwnKanbanOnly(role, explicitPermissions),
      canEditKanbanTask: (task: {
        createdBy?: { id: string } | null;
        assignees?: Array<{ id: string }>;
      }) => canEditKanbanTask(role, user?.id ?? null, task, explicitPermissions),
      canDeactivateUsers: () =>
        hasPermission(role, "users:deactivate", explicitPermissions),
      canManageUsers: () =>
        hasPermission(role, "users:manage", explicitPermissions),
      isMaster: () => isMasterRole(role),
      isMasterOrAdmin: () => isMasterOrAdmin(role),
      canPerformInternalApproval: () => canPerformInternalApproval(role),
      canAccessClientDirectory: () => canAccessClientDirectory(role),
    };
  }, [user?.id, user?.permissions, user?.role]);
}
