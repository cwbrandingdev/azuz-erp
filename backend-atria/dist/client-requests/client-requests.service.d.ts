import { Prisma } from '@prisma/client';
import { KanbanService } from '../kanban/kanban.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClientRequestNotificationService } from './client-request-notification.service';
import { ConvertClientRequestToTaskDto, CreateClientRequestCommentDto, CreateClientRequestDto, QueryClientRequestsDto, RejectClientRequestDto, UpdateClientRequestDto } from './dto/client-request.dto';
export declare class ClientRequestsService {
    private readonly prisma;
    private readonly kanbanService;
    private readonly requestNotifications;
    constructor(prisma: PrismaService, kanbanService: KanbanService, requestNotifications: ClientRequestNotificationService);
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
        referenceLinks: Prisma.JsonArray;
        attachments: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
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
    findAllForClient(clientId: string, query?: QueryClientRequestsDto): Promise<{
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
        referenceLinks: Prisma.JsonArray;
        attachments: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
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
        referenceLinks: Prisma.JsonArray;
        attachments: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
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
    create(dto: CreateClientRequestDto, options?: {
        clientId?: string;
        companyId?: string;
        authorId?: string;
    }): Promise<{
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
        referenceLinks: Prisma.JsonArray;
        attachments: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
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
    createForClient(clientId: string, companyId: string | null | undefined, dto: CreateClientRequestDto): Promise<{
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
        referenceLinks: Prisma.JsonArray;
        attachments: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
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
        referenceLinks: Prisma.JsonArray;
        attachments: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
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
    reject(id: string, dto: RejectClientRequestDto): Promise<{
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
        referenceLinks: Prisma.JsonArray;
        attachments: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
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
    convertToTask(id: string, userId: string, dto?: ConvertClientRequestToTaskDto): Promise<{
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
            referenceLinks: Prisma.JsonArray;
            attachments: string | number | boolean | Prisma.JsonObject | Prisma.JsonArray;
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
    remove(id: string): Promise<void>;
    addComment(requestId: string, authorId: string, dto: CreateClientRequestCommentDto, options?: {
        clientId?: string;
        authorEmail?: string;
    }): Promise<{
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
    private resolveAuthorUserId;
    private ensureExists;
    private toJsonArray;
    private formatContentTypeLabel;
    private serializeContentType;
    private toCommentResponse;
    private toResponse;
}
