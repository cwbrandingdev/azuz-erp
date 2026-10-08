import { type AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ClientRequestsService } from './client-requests.service';
import { CreateClientRequestCommentDto, CreateClientRequestDto, ConvertClientRequestToTaskDto, QueryClientRequestsDto, UpdateClientRequestDto } from './dto/client-request.dto';
export declare class ClientRequestsController {
    private readonly clientRequestsService;
    constructor(clientRequestsService: ClientRequestsService);
    findAll(query: QueryClientRequestsDto): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        clientId: string;
        client: {
            id: string;
            companyName: string;
        } | null;
        title: string;
        description: string | null;
        contentType: string;
        referenceLinks: import("@prisma/client/runtime/library").JsonArray;
        attachments: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
        status: string;
        rejectionReason: string | null;
        relatedTaskId: string | null;
        comments: {
            id: string;
            requestId: string;
            body: string;
            parentId: string | null;
            author: {
                id: string;
                name: string;
                avatarUrl: string | null;
                role: string | null;
            } | null;
            createdAt: string;
            updatedAt: string;
        }[];
        createdAt: string;
        updatedAt: string;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        clientId: string;
        client: {
            id: string;
            companyName: string;
        } | null;
        title: string;
        description: string | null;
        contentType: string;
        referenceLinks: import("@prisma/client/runtime/library").JsonArray;
        attachments: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
        status: string;
        rejectionReason: string | null;
        relatedTaskId: string | null;
        comments: {
            id: string;
            requestId: string;
            body: string;
            parentId: string | null;
            author: {
                id: string;
                name: string;
                avatarUrl: string | null;
                role: string | null;
            } | null;
            createdAt: string;
            updatedAt: string;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    create(user: AuthenticatedUser, dto: CreateClientRequestDto): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        clientId: string;
        client: {
            id: string;
            companyName: string;
        } | null;
        title: string;
        description: string | null;
        contentType: string;
        referenceLinks: import("@prisma/client/runtime/library").JsonArray;
        attachments: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
        status: string;
        rejectionReason: string | null;
        relatedTaskId: string | null;
        comments: {
            id: string;
            requestId: string;
            body: string;
            parentId: string | null;
            author: {
                id: string;
                name: string;
                avatarUrl: string | null;
                role: string | null;
            } | null;
            createdAt: string;
            updatedAt: string;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    addComment(user: AuthenticatedUser, id: string, dto: CreateClientRequestCommentDto): Promise<{
        id: string;
        requestId: string;
        body: string;
        parentId: string | null;
        author: {
            id: string;
            name: string;
            avatarUrl: string | null;
            role: string | null;
        } | null;
        createdAt: string;
        updatedAt: string;
    }>;
    convertToTask(user: AuthenticatedUser, id: string, dto: ConvertClientRequestToTaskDto): Promise<{
        request: {
            id: string;
            tenantId: string;
            companyId: string;
            clientId: string;
            client: {
                id: string;
                companyName: string;
            } | null;
            title: string;
            description: string | null;
            contentType: string;
            referenceLinks: import("@prisma/client/runtime/library").JsonArray;
            attachments: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
            status: string;
            rejectionReason: string | null;
            relatedTaskId: string | null;
            comments: {
                id: string;
                requestId: string;
                body: string;
                parentId: string | null;
                author: {
                    id: string;
                    name: string;
                    avatarUrl: string | null;
                    role: string | null;
                } | null;
                createdAt: string;
                updatedAt: string;
            }[];
            createdAt: string;
            updatedAt: string;
        };
        task: {
            postCaption: string | null;
            referenceUrl: string | null;
            columnId: string;
            column: {
                id: string;
                title: string;
                order: number;
                color: string;
                type: "to_do" | "in_progress" | "done" | "custom" | null;
                statusKey: import("../kanban/kanban-status").KanbanTaskStatusApi | null;
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
            status: import("../kanban/kanban-status").KanbanTaskStatusApi;
            productionPhase: import("../kanban/production-phase").ProductionPhaseApi | null;
            contentType: import("../kanban/kanban-content-type").KanbanTaskContentTypeApi;
            statusColor: string;
            statusLabel: string;
            dueDate: string | null;
            publicationDate: string | null;
            deliveryDate: string | null;
            clientId: string | null;
            companyId: string;
            client: import("../kanban/kanban-task.mapper").UnifiedTaskClient | null;
            createdAt: string;
        };
        alreadyConverted: boolean;
    }>;
    update(id: string, dto: UpdateClientRequestDto): Promise<{
        id: string;
        tenantId: string;
        companyId: string;
        clientId: string;
        client: {
            id: string;
            companyName: string;
        } | null;
        title: string;
        description: string | null;
        contentType: string;
        referenceLinks: import("@prisma/client/runtime/library").JsonArray;
        attachments: string | number | boolean | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
        status: string;
        rejectionReason: string | null;
        relatedTaskId: string | null;
        comments: {
            id: string;
            requestId: string;
            body: string;
            parentId: string | null;
            author: {
                id: string;
                name: string;
                avatarUrl: string | null;
                role: string | null;
            } | null;
            createdAt: string;
            updatedAt: string;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    remove(id: string): Promise<void>;
}
