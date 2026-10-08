import { KanbanTaskContentType, KanbanTaskPriority, KanbanTaskStatus, InternalReviewStatus, ProductionPhase, Prisma } from '@prisma/client';
import { DeliverablesService } from '../deliverables/deliverables.service';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SlaService } from '../sla/sla.service';
import { CreateCommentDto } from './dto/comment.dto';
import { CreateColumnDto, ReorderColumnsDto, UpdateColumnDto } from './dto/column.dto';
import { QueryDeletionHistoryDto } from './dto/deletion-history.dto';
import { CreateTaskDto, MoveTaskDto, QueryTasksDto, UpdateTaskDto, UpdateTaskStatusDto } from './dto/task.dto';
import { InternalReviewDto } from './dto/internal-review.dto';
type PreparedTaskCreate = {
    title: string;
    description?: string;
    postCaption?: string;
    columnId: string;
    status: KanbanTaskStatus;
    productionPhase: ProductionPhase | null;
    contentType: KanbanTaskContentType;
    clientId?: string;
    contentPostId?: string;
    calendarEventId?: string;
    assignedGroupId: string | null;
    referenceUrl?: string;
    priority: KanbanTaskPriority;
    dueDate: Date | null;
    publicationDate: Date | null;
    deliveryDate: Date | null;
    slaResponseDueAt: Date | null;
    slaResolutionDueAt: Date | null;
    createdById: string;
    assigneeIds: string[];
};
export declare class KanbanService {
    private readonly prisma;
    private readonly notifications;
    private readonly slaService;
    private readonly storage;
    private readonly deliverablesService;
    constructor(prisma: PrismaService, notifications: NotificationsService, slaService: SlaService, storage: SupabaseStorageService, deliverablesService: DeliverablesService);
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
    updateColumn(id: string, dto: UpdateColumnDto): Promise<{
        id: string;
        title: string;
        order: number;
        color: string;
        type: "to_do" | "in_progress" | "done" | "custom" | null;
        statusKey: import("./kanban-status").KanbanTaskStatusApi | null;
    }>;
    deleteColumn(id: string): Promise<void>;
    reorderColumns(dto: ReorderColumnsDto): Promise<{
        id: string;
        title: string;
        order: number;
        color: string;
        type: "to_do" | "in_progress" | "done" | "custom" | null;
        statusKey: import("./kanban-status").KanbanTaskStatusApi | null;
    }[]>;
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
    createTask(userId: string, dto: CreateTaskDto, options?: {
        tx?: Prisma.TransactionClient;
        skipSideEffects?: boolean;
        prepared?: PreparedTaskCreate;
    }): Promise<{
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
    prepareTaskCreate(userId: string, dto: CreateTaskDto): Promise<{
        title: string;
        description: string | undefined;
        postCaption: string | undefined;
        columnId: string;
        status: import("@prisma/client").$Enums.KanbanTaskStatus;
        productionPhase: import("@prisma/client").$Enums.ProductionPhase | null;
        contentType: import("@prisma/client").$Enums.KanbanTaskContentType;
        clientId: string | undefined;
        contentPostId: string | undefined;
        calendarEventId: string | undefined;
        assignedGroupId: string | null;
        referenceUrl: string | undefined;
        priority: import("@prisma/client").$Enums.KanbanTaskPriority;
        dueDate: Date | null;
        publicationDate: Date | null;
        deliveryDate: Date | null;
        slaResponseDueAt: Date;
        slaResolutionDueAt: Date;
        createdById: string;
        assigneeIds: string[];
    }>;
    private insertPreparedTask;
    finalizeNewTask(userId: string, taskId: string): Promise<{
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
    updateTask(userId: string, role: string, id: string, dto: UpdateTaskDto): Promise<{
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
    updateTaskStatus(userId: string, role: string, id: string, dto: UpdateTaskStatusDto): Promise<{
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
    moveTask(userId: string, role: string, id: string, dto: MoveTaskDto): Promise<{
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
    updateInternalReview(userId: string, role: string, taskId: string, dto: InternalReviewDto): Promise<{
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
    applyInternalApproval(taskId: string, userId: string, role: string, note?: string | null): Promise<void>;
    applyInternalAdjustment(taskId: string, userId?: string | null, reason?: string | null): Promise<void>;
    applyClientRejection(taskId: string, userId?: string | null, reason?: string | null): Promise<void>;
    applyClientApproval(taskId: string, userId?: string | null): Promise<void>;
    uploadTaskAsset(userId: string, role: string, taskId: string, file: Express.Multer.File, caption?: string): Promise<{
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
    }>;
    deleteTaskAsset(userId: string, role: string, taskId: string, assetId: string): Promise<void>;
    bulkDeleteTaskAssets(userId: string, role: string, taskId: string, assetIds: string[]): Promise<{
        deletedCount: number;
    }>;
    deleteTask(userId: string, role: string, id: string): Promise<void>;
    clearAllTasks(userId: string, role: string): Promise<{
        deletedCount: number;
    }>;
    getDeletionHistory(query: QueryDeletionHistoryDto): Promise<{
        items: {
            id: string;
            entityType: import("@prisma/client").$Enums.DeletionEntityType;
            entityId: string;
            title: string | null;
            metadata: Prisma.JsonValue;
            deletedAt: string;
            deletedBy: {
                id: string;
                name: string;
                avatarUrl: string | null;
            };
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getComments(taskId: string): Promise<{
        id: string;
        content: string;
        createdAt: string;
        user: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    }[]>;
    createComment(userId: string, taskId: string, dto: CreateCommentDto): Promise<{
        id: string;
        content: string;
        createdAt: string;
        user: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    }>;
    getHistory(taskId: string): Promise<{
        id: string;
        action: string;
        createdAt: string;
        user: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
    }[]>;
    private ensureStatusColumns;
    private resolveColumnForStatus;
    applyClientReviewOutcome(contentPostId: string, approved: boolean, reason?: string | null): Promise<void>;
    private ensureCalendarEventForTask;
    private syncLinkedCalendarEventDates;
    private syncCalendarEventColor;
    private assertValidProductionColumnTarget;
    private taskInclude;
    private ensureColumnExists;
    private persistTaskAssetFile;
    private ensureTaskExists;
    private ensureGroupExists;
    private resolveGroupMemberIds;
    private resolveAssigneeIds;
    private validateAssignees;
    private syncTaskAssetsToContentPost;
    publishTaskForClientReview(taskId: string, userId: string, review: {
        internalReviewStatus: InternalReviewStatus;
        internalReviewNote: string | null;
    }): Promise<void>;
    private ensureClientExists;
    private logHistory;
    private logHistoryIfUser;
    private logTaskChanges;
    private toColumnResponse;
    private toTaskResponse;
    private mapInternalReviewAction;
    private resolvePostCopy;
    private syncContentPostCopy;
    private resolveTaskSchedule;
    private parseTaskRangeStart;
    private parseTaskRangeEnd;
}
export {};
