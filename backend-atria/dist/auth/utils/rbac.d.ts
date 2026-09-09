import { PermissionKey } from '../constants/permissions';
export declare function canEditAllKanban(role: string): boolean;
export declare function canEditOwnKanbanOnly(role: string): boolean;
export declare function isTaskAssignedToUser(userId: string, task: {
    createdById: string;
    assignees: Array<{
        userId: string;
    }>;
}): boolean;
export declare function canPerformInternalApproval(role: string): boolean;
export declare function assertCanPerformInternalApproval(role: string): void;
export declare function assertMasterRole(role: string): void;
export declare function canEditAllCalendar(role: string): boolean;
export declare function canEditOwnCalendarOnly(role: string): boolean;
export declare function assertKanbanTaskEditAccess(role: string, userId: string, task: {
    createdById: string;
    assignees: Array<{
        userId: string;
    }>;
}): void;
export declare function assertCalendarEventEditAccess(role: string, userId: string, event: {
    createdById: string;
    assigneeId: string | null;
    assignedGroupId?: string | null;
    assignedGroup?: {
        members?: Array<{
            userId: string;
        }>;
        users?: Array<{
            id: string;
        }>;
    } | null;
}): void;
export declare function hasCrmAccess(role: string): boolean;
export declare function canAccessAllOrganizations(role: string): boolean;
export declare function getRequiredCrmPermissions(): PermissionKey[];
export declare function getRequiredKanbanEditPermissions(): PermissionKey[];
export declare function getRequiredCalendarEditPermissions(): PermissionKey[];
