import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateTaskDto, QueryTasksDto, UpdateTaskStatusDto } from './dto/task.dto';
import { KanbanService } from './kanban.service';
export declare class TasksController {
    private readonly kanbanService;
    constructor(kanbanService: KanbanService);
    getTasks(query: QueryTasksDto): Promise<{
        postCaption: string | null;
        referenceUrl: string | null;
        columnId: string;
        column: {
            id: string;
            title: string;
            order: number;
            color: string;
            type: "to_do" | "in_progress" | "done" | "custom" | null;
            statusKey: import("./kanban-status").KanbanTaskStatusApi | null;
        } | null;
        contentPostId: string | null;
        calendarEventId: string | null;
        internalReviewStatus: "not_required" | "pending" | "approved" | "rejected";
        internalReviewNote: string | null;
        isBypassingInternalReview: boolean;
        priority: "critical" | "high" | "medium" | "low" | "planned";
        order: number;
        slaResponseDueAt: string | null;
        slaResolutionDueAt: string | null;
        firstResponseAt: string | null;
        resolvedAt: string | null;
        slaStatus: import("../sla/sla.utils").SlaUiStatus;
        assignedGroupId: string | null;
        assignedGroup: {
            id: string;
            name: string;
            color: string;
        } | null;
        assignees: {
            id: string;
            name: string;
            avatarUrl: string | null;
        }[];
        createdBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        assets: {
            id: string;
            fileName: string;
            fileUrl: string;
            fileType: string;
            fileSize: number | null;
            caption: string | null;
            uploadedAt: string;
            uploadedBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        }[];
        updatedAt: string;
        id: string;
        title: string;
        description: string | null;
        status: import("./kanban-status").KanbanTaskStatusApi;
        productionPhase: import("./production-phase").ProductionPhaseApi | null;
        contentType: import("./kanban-content-type").KanbanTaskContentTypeApi;
        statusColor: string;
        statusLabel: string;
        dueDate: string | null;
        publicationDate: string | null;
        deliveryDate: string | null;
        clientId: string | null;
        companyId: string;
        client: import("./kanban-task.mapper").UnifiedTaskClient | null;
        createdAt: string;
    }[]>;
    getTask(id: string): Promise<{
        postCaption: string | null;
        referenceUrl: string | null;
        columnId: string;
        column: {
            id: string;
            title: string;
            order: number;
            color: string;
            type: "to_do" | "in_progress" | "done" | "custom" | null;
            statusKey: import("./kanban-status").KanbanTaskStatusApi | null;
        } | null;
        contentPostId: string | null;
        calendarEventId: string | null;
        internalReviewStatus: "not_required" | "pending" | "approved" | "rejected";
        internalReviewNote: string | null;
        isBypassingInternalReview: boolean;
        priority: "critical" | "high" | "medium" | "low" | "planned";
        order: number;
        slaResponseDueAt: string | null;
        slaResolutionDueAt: string | null;
        firstResponseAt: string | null;
        resolvedAt: string | null;
        slaStatus: import("../sla/sla.utils").SlaUiStatus;
        assignedGroupId: string | null;
        assignedGroup: {
            id: string;
            name: string;
            color: string;
        } | null;
        assignees: {
            id: string;
            name: string;
            avatarUrl: string | null;
        }[];
        createdBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        assets: {
            id: string;
            fileName: string;
            fileUrl: string;
            fileType: string;
            fileSize: number | null;
            caption: string | null;
            uploadedAt: string;
            uploadedBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        }[];
        updatedAt: string;
        id: string;
        title: string;
        description: string | null;
        status: import("./kanban-status").KanbanTaskStatusApi;
        productionPhase: import("./production-phase").ProductionPhaseApi | null;
        contentType: import("./kanban-content-type").KanbanTaskContentTypeApi;
        statusColor: string;
        statusLabel: string;
        dueDate: string | null;
        publicationDate: string | null;
        deliveryDate: string | null;
        clientId: string | null;
        companyId: string;
        client: import("./kanban-task.mapper").UnifiedTaskClient | null;
        createdAt: string;
    }>;
    createTask(user: AuthenticatedUser, dto: CreateTaskDto): Promise<{
        postCaption: string | null;
        referenceUrl: string | null;
        columnId: string;
        column: {
            id: string;
            title: string;
            order: number;
            color: string;
            type: "to_do" | "in_progress" | "done" | "custom" | null;
            statusKey: import("./kanban-status").KanbanTaskStatusApi | null;
        } | null;
        contentPostId: string | null;
        calendarEventId: string | null;
        internalReviewStatus: "not_required" | "pending" | "approved" | "rejected";
        internalReviewNote: string | null;
        isBypassingInternalReview: boolean;
        priority: "critical" | "high" | "medium" | "low" | "planned";
        order: number;
        slaResponseDueAt: string | null;
        slaResolutionDueAt: string | null;
        firstResponseAt: string | null;
        resolvedAt: string | null;
        slaStatus: import("../sla/sla.utils").SlaUiStatus;
        assignedGroupId: string | null;
        assignedGroup: {
            id: string;
            name: string;
            color: string;
        } | null;
        assignees: {
            id: string;
            name: string;
            avatarUrl: string | null;
        }[];
        createdBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        assets: {
            id: string;
            fileName: string;
            fileUrl: string;
            fileType: string;
            fileSize: number | null;
            caption: string | null;
            uploadedAt: string;
            uploadedBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        }[];
        updatedAt: string;
        id: string;
        title: string;
        description: string | null;
        status: import("./kanban-status").KanbanTaskStatusApi;
        productionPhase: import("./production-phase").ProductionPhaseApi | null;
        contentType: import("./kanban-content-type").KanbanTaskContentTypeApi;
        statusColor: string;
        statusLabel: string;
        dueDate: string | null;
        publicationDate: string | null;
        deliveryDate: string | null;
        clientId: string | null;
        companyId: string;
        client: import("./kanban-task.mapper").UnifiedTaskClient | null;
        createdAt: string;
    }>;
    updateStatus(user: AuthenticatedUser, id: string, dto: UpdateTaskStatusDto): Promise<{
        postCaption: string | null;
        referenceUrl: string | null;
        columnId: string;
        column: {
            id: string;
            title: string;
            order: number;
            color: string;
            type: "to_do" | "in_progress" | "done" | "custom" | null;
            statusKey: import("./kanban-status").KanbanTaskStatusApi | null;
        } | null;
        contentPostId: string | null;
        calendarEventId: string | null;
        internalReviewStatus: "not_required" | "pending" | "approved" | "rejected";
        internalReviewNote: string | null;
        isBypassingInternalReview: boolean;
        priority: "critical" | "high" | "medium" | "low" | "planned";
        order: number;
        slaResponseDueAt: string | null;
        slaResolutionDueAt: string | null;
        firstResponseAt: string | null;
        resolvedAt: string | null;
        slaStatus: import("../sla/sla.utils").SlaUiStatus;
        assignedGroupId: string | null;
        assignedGroup: {
            id: string;
            name: string;
            color: string;
        } | null;
        assignees: {
            id: string;
            name: string;
            avatarUrl: string | null;
        }[];
        createdBy: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        assets: {
            id: string;
            fileName: string;
            fileUrl: string;
            fileType: string;
            fileSize: number | null;
            caption: string | null;
            uploadedAt: string;
            uploadedBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        }[];
        updatedAt: string;
        id: string;
        title: string;
        description: string | null;
        status: import("./kanban-status").KanbanTaskStatusApi;
        productionPhase: import("./production-phase").ProductionPhaseApi | null;
        contentType: import("./kanban-content-type").KanbanTaskContentTypeApi;
        statusColor: string;
        statusLabel: string;
        dueDate: string | null;
        publicationDate: string | null;
        deliveryDate: string | null;
        clientId: string | null;
        companyId: string;
        client: import("./kanban-task.mapper").UnifiedTaskClient | null;
        createdAt: string;
    }>;
}
