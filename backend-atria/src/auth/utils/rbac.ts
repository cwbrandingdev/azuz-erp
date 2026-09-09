import { ForbiddenException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import {
  hasAnyPermission,
  hasPermission,
  normalizeRoleName,
  Permission,
  PermissionKey,
} from '../constants/permissions';

export function canEditAllKanban(role: string): boolean {
  return hasAnyPermission(role, [
    Permission.SYSTEM_ALL,
    Permission.KANBAN_ALL_EDIT,
  ]);
}

export function canEditOwnKanbanOnly(role: string): boolean {
  return (
    hasPermission(role, Permission.KANBAN_OWN_EDIT) && !canEditAllKanban(role)
  );
}

export function isTaskAssignedToUser(
  userId: string,
  task: {
    createdById: string;
    assignees: Array<{ userId: string }>;
  },
): boolean {
  return (
    task.createdById === userId ||
    task.assignees.some((assignee) => assignee.userId === userId)
  );
}

export function canPerformInternalApproval(role: string): boolean {
  const roleName = normalizeRoleName(role);
  return (
    roleName === RoleName.MASTER || roleName === RoleName.DESIGNER_MASTER
  );
}

export function assertCanPerformInternalApproval(role: string): void {
  if (!canPerformInternalApproval(role)) {
    throw new ForbiddenException(
      'Only MASTER and senior designer users can perform internal approval',
    );
  }
}

export function assertMasterRole(role: string): void {
  if (normalizeRoleName(role) !== RoleName.MASTER) {
    throw new ForbiddenException(
      'Only MASTER users can perform this action',
    );
  }
}

export function canEditAllCalendar(role: string): boolean {
  return hasAnyPermission(role, [
    Permission.SYSTEM_ALL,
    Permission.CALENDAR_ALL_EDIT,
  ]);
}

export function canEditOwnCalendarOnly(role: string): boolean {
  return (
    hasPermission(role, Permission.CALENDAR_OWN_EDIT) &&
    !canEditAllCalendar(role)
  );
}

export function assertKanbanTaskEditAccess(
  role: string,
  userId: string,
  task: {
    createdById: string;
    assignees: Array<{ userId: string }>;
  },
) {
  if (canEditAllKanban(role)) {
    return;
  }

  if (canEditOwnKanbanOnly(role)) {
    if (!isTaskAssignedToUser(userId, task)) {
      throw new ForbiddenException(
        'You can only edit Kanban tasks assigned to you',
      );
    }
    return;
  }

  throw new ForbiddenException('Insufficient permissions to edit Kanban tasks');
}

export function assertCalendarEventEditAccess(
  role: string,
  userId: string,
  event: {
    createdById: string;
    assigneeId: string | null;
    assignedGroupId?: string | null;
    assignedGroup?: {
      members?: Array<{ userId: string }>;
      users?: Array<{ id: string }>;
    } | null;
  },
) {
  if (canEditAllCalendar(role)) {
    return;
  }

  if (canEditOwnCalendarOnly(role)) {
    const groupMemberIds = new Set<string>();
    for (const member of event.assignedGroup?.members ?? []) {
      groupMemberIds.add(member.userId);
    }
    for (const user of event.assignedGroup?.users ?? []) {
      groupMemberIds.add(user.id);
    }

    const isAssigned =
      event.createdById === userId ||
      event.assigneeId === userId ||
      groupMemberIds.has(userId);

    if (!isAssigned) {
      throw new ForbiddenException(
        'You can only edit calendar events assigned to you',
      );
    }
    return;
  }

  throw new ForbiddenException(
    'Insufficient permissions to edit calendar events',
  );
}

export function hasCrmAccess(role: string): boolean {
  return hasPermission(role, [
    Permission.SYSTEM_ALL,
    Permission.CRM_ALL,
    Permission.CRM_ORG_LEADS,
  ]);
}

export function canAccessAllOrganizations(role: string): boolean {
  const roleName = normalizeRoleName(role);
  return roleName === RoleName.MASTER || roleName === RoleName.ADMIN;
}

export function getRequiredCrmPermissions(): PermissionKey[] {
  return [Permission.CRM_ALL, Permission.CRM_ORG_LEADS];
}

export function getRequiredKanbanEditPermissions(): PermissionKey[] {
  return [Permission.KANBAN_ALL_EDIT, Permission.KANBAN_OWN_EDIT];
}

export function getRequiredCalendarEditPermissions(): PermissionKey[] {
  return [Permission.CALENDAR_ALL_EDIT, Permission.CALENDAR_OWN_EDIT];
}
