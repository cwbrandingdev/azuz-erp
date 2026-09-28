import { KanbanTaskContentType, KanbanTaskPriority, KanbanTaskStatus, ProductionPhase } from '@prisma/client';
export declare class CreateTaskDto {
    title: string;
    description?: string;
    postCaption?: string;
    columnId?: string;
    contentType?: KanbanTaskContentType;
    priority?: KanbanTaskPriority;
    status?: KanbanTaskStatus;
    productionPhase?: ProductionPhase;
    dueDate?: string;
    publicationDate?: string;
    deliveryDate?: string;
    assigneeIds?: string[];
    assignedGroupId?: string;
    clientId?: string;
    contentPostId?: string;
    calendarEventId?: string;
    referenceUrl?: string;
}
export declare class UpdateTaskDto {
    title?: string;
    description?: string;
    postCaption?: string;
    columnId?: string;
    contentType?: KanbanTaskContentType;
    priority?: KanbanTaskPriority;
    status?: KanbanTaskStatus;
    productionPhase?: ProductionPhase;
    dueDate?: string;
    publicationDate?: string | null;
    deliveryDate?: string | null;
    assigneeIds?: string[];
    assignedGroupId?: string | null;
    order?: number;
    clientId?: string | null;
    referenceUrl?: string | null;
}
export declare class MoveTaskDto {
    columnId: string;
    order: number;
}
export declare class UpdateTaskStatusDto {
    status: KanbanTaskStatus;
}
export declare class BulkDeleteTaskAssetsDto {
    assetIds: string[];
}
export declare class QueryTasksDto {
    columnId?: string;
    clientId?: string;
    organizationId?: string;
    startDate?: string;
    endDate?: string;
}
