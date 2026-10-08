import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateCommentDto } from './dto/comment.dto';
import { CreateColumnDto, ReorderColumnsDto, UpdateColumnDto } from './dto/column.dto';
import { InternalReviewDto } from './dto/internal-review.dto';
import { QueryDeletionHistoryDto } from './dto/deletion-history.dto';
import { BulkDeleteTaskAssetsDto, CreateTaskDto, MoveTaskDto, QueryTasksDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { KanbanService } from './kanban.service';
export declare class KanbanController {
    private readonly kanbanService;
    constructor(kanbanService: KanbanService);
    getDeletionHistory(query: QueryDeletionHistoryDto): Promise<{
        items: {
            id: string;
            entityType: import("@prisma/client").$Enums.DeletionEntityType;
            entityId: string;
            title: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue;
            deletedAt: string;
            deletedBy: {
                id: string;
                avatarUrl: string | null;
                name: string;
            };
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    clearTasks(user: AuthenticatedUser): Promise<{
        deletedCount: number;
    }>;
    getColumns(): Promise<{
        id: string;
        title: string;
        order: number;
        color: string;
        type: "to_do" | "in_progress" | "done" | "custom" | null;
        statusKey: import("./kanban-status").KanbanTaskStatusApi | null;
    }[]>;
    createColumn(dto: CreateColumnDto): Promise<{
        id: string;
        title: string;
        order: number;
        color: string;
        type: "to_do" | "in_progress" | "done" | "custom" | null;
        statusKey: import("./kanban-status").KanbanTaskStatusApi | null;
    }>;
    reorderColumns(dto: ReorderColumnsDto): Promise<{
        id: string;
        title: string;
        order: number;
        color: string;
        type: "to_do" | "in_progress" | "done" | "custom" | null;
        statusKey: import("./kanban-status").KanbanTaskStatusApi | null;
    }[]>;
    updateColumn(id: string, dto: UpdateColumnDto): Promise<{
        id: string;
        title: string;
        order: number;
        color: string;
        type: "to_do" | "in_progress" | "done" | "custom" | null;
        statusKey: import("./kanban-status").KanbanTaskStatusApi | null;
    }>;
    deleteColumn(id: string): Promise<void>;
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
            avatarUrl: string | null;
            name: string;
        }[];
        createdBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
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
                avatarUrl: string | null;
                name: string;
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
            avatarUrl: string | null;
            name: string;
        }[];
        createdBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
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
                avatarUrl: string | null;
                name: string;
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
            avatarUrl: string | null;
            name: string;
        }[];
        createdBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
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
                avatarUrl: string | null;
                name: string;
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
    assignTask(user: AuthenticatedUser, id: string, dto: UpdateTaskDto): Promise<{
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
            avatarUrl: string | null;
            name: string;
        }[];
        createdBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
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
                avatarUrl: string | null;
                name: string;
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
    updateTask(user: AuthenticatedUser, id: string, dto: UpdateTaskDto): Promise<{
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
            avatarUrl: string | null;
            name: string;
        }[];
        createdBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
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
                avatarUrl: string | null;
                name: string;
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
    updateTaskStatus(user: AuthenticatedUser, id: string, dto: UpdateTaskStatusDto): Promise<{
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
            avatarUrl: string | null;
            name: string;
        }[];
        createdBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
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
                avatarUrl: string | null;
                name: string;
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
    moveTask(user: AuthenticatedUser, id: string, dto: MoveTaskDto): Promise<{
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
            avatarUrl: string | null;
            name: string;
        }[];
        createdBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
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
                avatarUrl: string | null;
                name: string;
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
    updateInternalReview(user: AuthenticatedUser, id: string, dto: InternalReviewDto): Promise<{
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
            avatarUrl: string | null;
            name: string;
        }[];
        createdBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
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
                avatarUrl: string | null;
                name: string;
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
    uploadTaskAsset(user: AuthenticatedUser, id: string, file: Express.Multer.File, caption?: string): Promise<{
        id: string;
        fileName: string;
        fileUrl: string;
        fileType: string;
        fileSize: number | null;
        caption: string | null;
        uploadedAt: string;
        uploadedBy: {
            id: string;
            avatarUrl: string | null;
            name: string;
        };
    }>;
    bulkDeleteTaskAssets(user: AuthenticatedUser, id: string, dto: BulkDeleteTaskAssetsDto): Promise<{
        deletedCount: number;
    }>;
    deleteTaskAsset(user: AuthenticatedUser, id: string, assetId: string): Promise<void>;
    deleteTask(user: AuthenticatedUser, id: string): Promise<void>;
    getComments(id: string): Promise<{
        id: string;
        content: string;
        createdAt: string;
        user: {
            id: string;
            avatarUrl: string | null;
            name: string;
        };
    }[]>;
    createComment(user: AuthenticatedUser, id: string, dto: CreateCommentDto): Promise<{
        id: string;
        content: string;
        createdAt: string;
        user: {
            id: string;
            avatarUrl: string | null;
            name: string;
        };
    }>;
    getHistory(id: string): Promise<{
        id: string;
        action: string;
        createdAt: string;
        user: {
            id: string;
            avatarUrl: string | null;
            name: string;
        };
    }[]>;
}
