"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canEditAllKanban = canEditAllKanban;
exports.canEditOwnKanbanOnly = canEditOwnKanbanOnly;
exports.isTaskAssignedToUser = isTaskAssignedToUser;
exports.canPerformInternalApproval = canPerformInternalApproval;
exports.assertCanPerformInternalApproval = assertCanPerformInternalApproval;
exports.assertMasterRole = assertMasterRole;
exports.canEditAllCalendar = canEditAllCalendar;
exports.canEditOwnCalendarOnly = canEditOwnCalendarOnly;
exports.assertKanbanTaskEditAccess = assertKanbanTaskEditAccess;
exports.assertCalendarEventEditAccess = assertCalendarEventEditAccess;
exports.hasCrmAccess = hasCrmAccess;
exports.canAccessAllOrganizations = canAccessAllOrganizations;
exports.getRequiredCrmPermissions = getRequiredCrmPermissions;
exports.getRequiredKanbanEditPermissions = getRequiredKanbanEditPermissions;
exports.getRequiredCalendarEditPermissions = getRequiredCalendarEditPermissions;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const permissions_1 = require("../constants/permissions");
function canEditAllKanban(role) {
    return (0, permissions_1.hasAnyPermission)(role, [
        permissions_1.Permission.SYSTEM_ALL,
        permissions_1.Permission.KANBAN_ALL_EDIT,
    ]);
}
function canEditOwnKanbanOnly(role) {
    return ((0, permissions_1.hasPermission)(role, permissions_1.Permission.KANBAN_OWN_EDIT) && !canEditAllKanban(role));
}
function isTaskAssignedToUser(userId, task) {
    return (task.createdById === userId ||
        task.assignees.some((assignee) => assignee.userId === userId));
}
function canPerformInternalApproval(role) {
    const roleName = (0, permissions_1.normalizeRoleName)(role);
    return (roleName === client_1.RoleName.MASTER || roleName === client_1.RoleName.DESIGNER_MASTER);
}
function assertCanPerformInternalApproval(role) {
    if (!canPerformInternalApproval(role)) {
        throw new common_1.ForbiddenException('Only MASTER and senior designer users can perform internal approval');
    }
}
function assertMasterRole(role) {
    if ((0, permissions_1.normalizeRoleName)(role) !== client_1.RoleName.MASTER) {
        throw new common_1.ForbiddenException('Only MASTER users can perform this action');
    }
}
function canEditAllCalendar(role) {
    return (0, permissions_1.hasAnyPermission)(role, [
        permissions_1.Permission.SYSTEM_ALL,
        permissions_1.Permission.CALENDAR_ALL_EDIT,
    ]);
}
function canEditOwnCalendarOnly(role) {
    return ((0, permissions_1.hasPermission)(role, permissions_1.Permission.CALENDAR_OWN_EDIT) &&
        !canEditAllCalendar(role));
}
function assertKanbanTaskEditAccess(role, userId, task) {
    if (canEditAllKanban(role)) {
        return;
    }
    if (canEditOwnKanbanOnly(role)) {
        if (!isTaskAssignedToUser(userId, task)) {
            throw new common_1.ForbiddenException('You can only edit Kanban tasks assigned to you');
        }
        return;
    }
    throw new common_1.ForbiddenException('Insufficient permissions to edit Kanban tasks');
}
function assertCalendarEventEditAccess(role, userId, event) {
    if (canEditAllCalendar(role)) {
        return;
    }
    if (canEditOwnCalendarOnly(role)) {
        const groupMemberIds = new Set();
        for (const member of event.assignedGroup?.members ?? []) {
            groupMemberIds.add(member.userId);
        }
        for (const user of event.assignedGroup?.users ?? []) {
            groupMemberIds.add(user.id);
        }
        const isAssigned = event.createdById === userId ||
            event.assigneeId === userId ||
            groupMemberIds.has(userId);
        if (!isAssigned) {
            throw new common_1.ForbiddenException('You can only edit calendar events assigned to you');
        }
        return;
    }
    throw new common_1.ForbiddenException('Insufficient permissions to edit calendar events');
}
function hasCrmAccess(role) {
    return (0, permissions_1.hasPermission)(role, [
        permissions_1.Permission.SYSTEM_ALL,
        permissions_1.Permission.CRM_ALL,
        permissions_1.Permission.CRM_ORG_LEADS,
    ]);
}
function canAccessAllOrganizations(role) {
    const roleName = (0, permissions_1.normalizeRoleName)(role);
    return roleName === client_1.RoleName.MASTER || roleName === client_1.RoleName.ADMIN;
}
function getRequiredCrmPermissions() {
    return [permissions_1.Permission.CRM_ALL, permissions_1.Permission.CRM_ORG_LEADS];
}
function getRequiredKanbanEditPermissions() {
    return [permissions_1.Permission.KANBAN_ALL_EDIT, permissions_1.Permission.KANBAN_OWN_EDIT];
}
function getRequiredCalendarEditPermissions() {
    return [permissions_1.Permission.CALENDAR_ALL_EDIT, permissions_1.Permission.CALENDAR_OWN_EDIT];
}
//# sourceMappingURL=rbac.js.map